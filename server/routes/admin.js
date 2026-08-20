const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authMiddleware, adminMiddleware } = require('../auth');

const router = express.Router();
router.use(authMiddleware, adminMiddleware);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function genId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/* ================= STATS ================= */

router.get('/stats', (req, res) => {
  const members = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'member'").get().c;
  const eventsCount = db.prepare('SELECT COUNT(*) AS c FROM events').get().c;
  const prayerTypesCount = db.prepare('SELECT COUNT(*) AS c FROM prayer_types').get().c;
  const orders = db.prepare("SELECT COUNT(*) AS c, COALESCE(SUM(total), 0) AS revenue FROM orders WHERE status = 'paid'").get();
  const recentOrders = db
    .prepare(`
      SELECT o.order_no, o.ref_title, o.total, o.created_at, u.name AS member_name
      FROM orders o JOIN users u ON u.id = o.user_id
      ORDER BY o.id DESC LIMIT 8
    `)
    .all();
  res.json({
    members,
    events: eventsCount,
    prayerTypes: prayerTypesCount,
    orders: orders.c,
    revenue: orders.revenue,
    recentOrders,
  });
});

/* ================= EVENTS ================= */

router.get('/events', (req, res) => {
  const events = db.prepare('SELECT * FROM events ORDER BY sort_order ASC, id ASC').all();
  const items = db.prepare('SELECT * FROM event_items ORDER BY sort_order ASC').all();
  res.json({
    events: events.map((e) => ({ ...e, items: items.filter((it) => it.event_id === e.id) })),
  });
});

router.post('/events', (req, res) => {
  const { status, title, dateLabel, eventDate, place, tag, description, cover } = req.body || {};
  if (!title || !dateLabel || !eventDate) return res.status(400).json({ error: '请填写法会标题与日期' });
  const id = genId('ev');
  const { c: sort } = db.prepare('SELECT COUNT(*) AS c FROM events').get();
  db.prepare(`
    INSERT INTO events (id, status, title, date_label, event_date, place, tag, description, cover, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, status || 'upcoming', title, dateLabel, eventDate, place || '灵一守玄坛', tag || '', description || '', cover || 'linear-gradient(135deg,#3a1712,#1a0e0c)', sort);
  res.status(201).json({ event: db.prepare('SELECT * FROM events WHERE id = ?').get(id) });
});

router.put('/events/:id', (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: '法会不存在' });
  const { status, title, dateLabel, eventDate, place, tag, description, cover } = req.body || {};
  db.prepare(`
    UPDATE events SET status = ?, title = ?, date_label = ?, event_date = ?, place = ?, tag = ?, description = ?, cover = ?
    WHERE id = ?
  `).run(
    status ?? event.status, title ?? event.title, dateLabel ?? event.date_label, eventDate ?? event.event_date,
    place ?? event.place, tag ?? event.tag, description ?? event.description, cover ?? event.cover, req.params.id
  );
  res.json({ event: db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id) });
});

router.delete('/events/:id', (req, res) => {
  db.prepare('DELETE FROM event_items WHERE event_id = ?').run(req.params.id);
  const info = db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: '法会不存在' });
  res.json({ ok: true });
});

router.post('/events/:id/items', (req, res) => {
  const event = db.prepare('SELECT id FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: '法会不存在' });
  const { name, price } = req.body || {};
  if (!name || typeof price !== 'number' || price < 0) return res.status(400).json({ error: '请填写项目名称与价格' });
  const id = genId('ei');
  const { c: sort } = db.prepare('SELECT COUNT(*) AS c FROM event_items WHERE event_id = ?').get(req.params.id);
  db.prepare('INSERT INTO event_items (id, event_id, name, price, sort_order) VALUES (?, ?, ?, ?, ?)')
    .run(id, req.params.id, name, price, sort);
  res.status(201).json({ item: db.prepare('SELECT * FROM event_items WHERE id = ?').get(id) });
});

router.put('/events/:eventId/items/:itemId', (req, res) => {
  const item = db.prepare('SELECT * FROM event_items WHERE id = ? AND event_id = ?').get(req.params.itemId, req.params.eventId);
  if (!item) return res.status(404).json({ error: '项目不存在' });
  const { name, price } = req.body || {};
  db.prepare('UPDATE event_items SET name = ?, price = ? WHERE id = ?')
    .run(name ?? item.name, typeof price === 'number' ? price : item.price, req.params.itemId);
  res.json({ item: db.prepare('SELECT * FROM event_items WHERE id = ?').get(req.params.itemId) });
});

router.delete('/events/:eventId/items/:itemId', (req, res) => {
  const info = db.prepare('DELETE FROM event_items WHERE id = ? AND event_id = ?').run(req.params.itemId, req.params.eventId);
  if (info.changes === 0) return res.status(404).json({ error: '项目不存在' });
  res.json({ ok: true });
});

/* ================= PRAYER CATALOG ================= */

router.get('/prayers/categories', (req, res) => {
  const categories = db.prepare('SELECT * FROM prayer_categories ORDER BY sort_order ASC, id ASC').all();
  const types = db.prepare('SELECT * FROM prayer_types ORDER BY sort_order ASC').all();
  res.json({
    categories: categories.map((c) => ({ ...c, types: types.filter((t) => t.category_id === c.id) })),
  });
});

router.post('/prayers/categories', (req, res) => {
  const { name, icon, description } = req.body || {};
  if (!name) return res.status(400).json({ error: '请填写分类名称' });
  const id = genId('c');
  const { c: sort } = db.prepare('SELECT COUNT(*) AS c FROM prayer_categories').get();
  db.prepare('INSERT INTO prayer_categories (id, name, icon, description, sort_order) VALUES (?, ?, ?, ?, ?)')
    .run(id, name, icon || 'more', description || '', sort);
  res.status(201).json({ category: db.prepare('SELECT * FROM prayer_categories WHERE id = ?').get(id) });
});

router.put('/prayers/categories/:id', (req, res) => {
  const cat = db.prepare('SELECT * FROM prayer_categories WHERE id = ?').get(req.params.id);
  if (!cat) return res.status(404).json({ error: '分类不存在' });
  const { name, icon, description } = req.body || {};
  db.prepare('UPDATE prayer_categories SET name = ?, icon = ?, description = ? WHERE id = ?')
    .run(name ?? cat.name, icon ?? cat.icon, description ?? cat.description, req.params.id);
  res.json({ category: db.prepare('SELECT * FROM prayer_categories WHERE id = ?').get(req.params.id) });
});

router.delete('/prayers/categories/:id', (req, res) => {
  db.prepare('DELETE FROM prayer_types WHERE category_id = ?').run(req.params.id);
  const info = db.prepare('DELETE FROM prayer_categories WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: '分类不存在' });
  res.json({ ok: true });
});

router.post('/prayers/categories/:id/types', (req, res) => {
  const cat = db.prepare('SELECT id FROM prayer_categories WHERE id = ?').get(req.params.id);
  if (!cat) return res.status(404).json({ error: '分类不存在' });
  const { name, description, price } = req.body || {};
  if (!name || typeof price !== 'number' || price < 0) return res.status(400).json({ error: '请填写疏文名称与价格' });
  const id = genId('t');
  const { c: sort } = db.prepare('SELECT COUNT(*) AS c FROM prayer_types WHERE category_id = ?').get(req.params.id);
  db.prepare('INSERT INTO prayer_types (id, category_id, name, description, price, sort_order) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, req.params.id, name, description || '', price, sort);
  res.status(201).json({ type: db.prepare('SELECT * FROM prayer_types WHERE id = ?').get(id) });
});

router.put('/prayers/types/:id', (req, res) => {
  const t = db.prepare('SELECT * FROM prayer_types WHERE id = ?').get(req.params.id);
  if (!t) return res.status(404).json({ error: '疏文不存在' });
  const { name, description, price } = req.body || {};
  db.prepare('UPDATE prayer_types SET name = ?, description = ?, price = ? WHERE id = ?')
    .run(name ?? t.name, description ?? t.description, typeof price === 'number' ? price : t.price, req.params.id);
  res.json({ type: db.prepare('SELECT * FROM prayer_types WHERE id = ?').get(req.params.id) });
});

router.delete('/prayers/types/:id', (req, res) => {
  const info = db.prepare('DELETE FROM prayer_types WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: '疏文不存在' });
  res.json({ ok: true });
});

/* ================= ANNOUNCEMENTS ================= */

router.get('/announcements', (req, res) => {
  res.json({ announcements: db.prepare('SELECT * FROM announcements ORDER BY sort_order ASC, id DESC').all() });
});

router.post('/announcements', (req, res) => {
  const { badge, title, body, linkKind, linkId, active } = req.body || {};
  if (!title || !body) return res.status(400).json({ error: '请填写标题与内容' });
  const id = genId('a');
  const { c: sort } = db.prepare('SELECT COUNT(*) AS c FROM announcements').get();
  db.prepare(`
    INSERT INTO announcements (id, badge, title, body, link_kind, link_id, active, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, badge || '公告', title, body, linkKind || null, linkId || null, active === false ? 0 : 1, sort);
  res.status(201).json({ announcement: db.prepare('SELECT * FROM announcements WHERE id = ?').get(id) });
});

router.put('/announcements/:id', (req, res) => {
  const a = db.prepare('SELECT * FROM announcements WHERE id = ?').get(req.params.id);
  if (!a) return res.status(404).json({ error: '公告不存在' });
  const { badge, title, body, linkKind, linkId, active } = req.body || {};
  db.prepare(`
    UPDATE announcements SET badge = ?, title = ?, body = ?, link_kind = ?, link_id = ?, active = ? WHERE id = ?
  `).run(
    badge ?? a.badge, title ?? a.title, body ?? a.body,
    linkKind !== undefined ? linkKind : a.link_kind, linkId !== undefined ? linkId : a.link_id,
    active === undefined ? a.active : (active ? 1 : 0), req.params.id
  );
  res.json({ announcement: db.prepare('SELECT * FROM announcements WHERE id = ?').get(req.params.id) });
});

router.delete('/announcements/:id', (req, res) => {
  const info = db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: '公告不存在' });
  res.json({ ok: true });
});

/* ================= ORDERS (read-only) ================= */

router.get('/orders', (req, res) => {
  const orders = db
    .prepare(`
      SELECT o.*, u.name AS member_name, u.email AS member_email
      FROM orders o JOIN users u ON u.id = o.user_id
      ORDER BY o.id DESC LIMIT 300
    `)
    .all();
  res.json({ orders });
});

router.get('/orders/:orderNo', (req, res) => {
  const order = db
    .prepare(`
      SELECT o.*, u.name AS member_name, u.email AS member_email
      FROM orders o JOIN users u ON u.id = o.user_id
      WHERE o.order_no = ?
    `)
    .get(req.params.orderNo);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  const members = db.prepare('SELECT * FROM order_members WHERE order_id = ?').all(order.id);
  res.json({ order: { ...order, items, members } });
});

/* ================= MEMBERS ================= */

router.get('/members', (req, res) => {
  const members = db
    .prepare(`
      SELECT u.id, u.name, u.email, u.phone, u.created_at,
        COUNT(o.id) AS order_count, COALESCE(SUM(o.total), 0) AS total_spent
      FROM users u LEFT JOIN orders o ON o.user_id = u.id AND o.status = 'paid'
      WHERE u.role = 'member'
      GROUP BY u.id
      ORDER BY u.id DESC
    `)
    .all();
  res.json({ members });
});

router.post('/members', (req, res) => {
  const { name, email, phone, password } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: '请输入姓名' });
  if (!email || !EMAIL_RE.test(String(email).trim())) return res.status(400).json({ error: '请输入有效的邮箱' });
  if (!password || String(password).length < 6) return res.status(400).json({ error: '密码至少需要 6 位' });

  const emailNorm = String(email).trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(emailNorm);
  if (existing) return res.status(409).json({ error: '该邮箱已被注册' });

  const passwordHash = bcrypt.hashSync(String(password), 10);
  const info = db
    .prepare("INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, 'member')")
    .run(String(name).trim(), emailNorm, phone ? String(phone).trim() : null, passwordHash);

  const member = db
    .prepare('SELECT id, name, email, phone, created_at, 0 AS order_count, 0 AS total_spent FROM users WHERE id = ?')
    .get(info.lastInsertRowid);
  res.status(201).json({ member });
});

router.put('/members/:id', (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'member'").get(req.params.id);
  if (!user) return res.status(404).json({ error: '会员不存在' });

  const { name, email, phone, password } = req.body || {};
  let emailNorm = user.email;
  if (email !== undefined) {
    if (!EMAIL_RE.test(String(email).trim())) return res.status(400).json({ error: '请输入有效的邮箱' });
    emailNorm = String(email).trim().toLowerCase();
    const conflict = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(emailNorm, user.id);
    if (conflict) return res.status(409).json({ error: '该邮箱已被其他账号使用' });
  }
  if (password !== undefined && password !== '' && String(password).length < 6) {
    return res.status(400).json({ error: '密码至少需要 6 位' });
  }

  const passwordHash = password ? bcrypt.hashSync(String(password), 10) : user.password_hash;
  db.prepare('UPDATE users SET name = ?, email = ?, phone = ?, password_hash = ? WHERE id = ?')
    .run(name !== undefined ? String(name).trim() : user.name, emailNorm, phone !== undefined ? String(phone).trim() : user.phone, passwordHash, user.id);

  const member = db
    .prepare(`
      SELECT u.id, u.name, u.email, u.phone, u.created_at,
        COUNT(o.id) AS order_count, COALESCE(SUM(o.total), 0) AS total_spent
      FROM users u LEFT JOIN orders o ON o.user_id = u.id AND o.status = 'paid'
      WHERE u.id = ? GROUP BY u.id
    `)
    .get(user.id);
  res.json({ member });
});

module.exports = router;
