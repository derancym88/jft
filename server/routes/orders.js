const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../auth');
const { notifyUser } = require('../notify');

const router = express.Router();
router.use(authMiddleware);

const PAY_METHODS = new Set(['fpx', 'grabpay', 'tng']);

function nextOrderNo() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const prefix = `LY${ymd}`;
  const row = db
    .prepare("SELECT order_no FROM orders WHERE order_no LIKE ? ORDER BY order_no DESC LIMIT 1")
    .get(`${prefix}%`);
  const seq = row ? Number(row.order_no.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(seq).padStart(5, '0')}`;
}

function loadOrder(id, userId) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(id, userId);
  if (!order) return null;
  const items = db.prepare('SELECT id, name, price, qty FROM order_items WHERE order_id = ?').all(order.id);
  const members = db.prepare('SELECT id, name, idnum FROM order_members WHERE order_id = ?').all(order.id);
  return serializeOrder(order, items, members);
}

function serializeOrder(order, items, members) {
  return {
    id: order.order_no,
    dbId: order.id,
    kind: order.kind,
    refId: order.ref_id,
    title: order.ref_title,
    total: order.total,
    payMethod: order.pay_method,
    status: order.status,
    main: {
      name: order.main_name,
      idnum: order.main_idnum,
      dob: order.main_dob,
      addr: order.main_addr,
      phone: order.main_phone,
    },
    members,
    items,
    createdAt: order.created_at,
  };
}

router.post('/', (req, res) => {
  const { kind, refId, refTitle, items, main, members, payMethod } = req.body || {};

  if (!['event', 'prayer'].includes(kind)) return res.status(400).json({ error: '订单类型无效' });
  if (!refId || !refTitle) return res.status(400).json({ error: '缺少法会/疏文信息' });
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: '请至少选择一项' });
  if (!main || !main.name || !String(main.name).trim()) return res.status(400).json({ error: '请填写主事人姓名' });
  if (!main.phone || !String(main.phone).trim()) return res.status(400).json({ error: '请填写联系电话' });
  if (!PAY_METHODS.has(payMethod)) return res.status(400).json({ error: '付款方式无效' });

  for (const it of items) {
    if (!it || !it.name || typeof it.price !== 'number' || it.price < 0) {
      return res.status(400).json({ error: '订单项目数据无效' });
    }
  }
  const memberList = Array.isArray(members) ? members.filter((m) => m && m.name) : [];
  const total = items.reduce((s, it) => s + Number(it.price) * (Number(it.qty) || 1), 0);
  const orderNo = nextOrderNo();

  db.exec('BEGIN');
  try {
    const info = db
      .prepare(`
        INSERT INTO orders
          (order_no, user_id, kind, ref_id, ref_title, total, pay_method, status,
           main_name, main_idnum, main_dob, main_addr, main_phone)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'paid', ?, ?, ?, ?, ?)
      `)
      .run(
        orderNo, req.userId, kind, refId, refTitle, total, payMethod,
        String(main.name).trim(), main.idnum || null, main.dob || null, main.addr || null, String(main.phone).trim()
      );
    const orderId = info.lastInsertRowid;

    const insertItem = db.prepare('INSERT INTO order_items (order_id, name, price, qty) VALUES (?, ?, ?, ?)');
    items.forEach((it) => insertItem.run(orderId, String(it.name), Number(it.price), Number(it.qty) || 1));

    const insertMember = db.prepare('INSERT INTO order_members (order_id, name, idnum) VALUES (?, ?, ?)');
    memberList.forEach((m) => insertMember.run(orderId, String(m.name).trim(), m.idnum || null));

    db.exec('COMMIT');

    notifyUser(req.userId, {
      type: 'order',
      title: '订单付款成功',
      body: `您的订单 ${orderNo}（${refTitle}）已付款成功，金额 RM ${total.toFixed(2)}。`,
      linkKind: 'order',
      linkId: orderNo,
    });

    res.status(201).json({ order: loadOrder(orderId, req.userId) });
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: '下单失败，请重试' });
  }
});

router.get('/', (req, res) => {
  const orders = db
    .prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC')
    .all(req.userId)
    .map((order) => {
      const items = db.prepare('SELECT id, name, price, qty FROM order_items WHERE order_id = ?').all(order.id);
      const members = db.prepare('SELECT id, name, idnum FROM order_members WHERE order_id = ?').all(order.id);
      return serializeOrder(order, items, members);
    });
  res.json({ orders });
});

router.get('/:orderNo', (req, res) => {
  const order = db
    .prepare('SELECT * FROM orders WHERE order_no = ? AND user_id = ?')
    .get(req.params.orderNo, req.userId);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  const items = db.prepare('SELECT id, name, price, qty FROM order_items WHERE order_id = ?').all(order.id);
  const members = db.prepare('SELECT id, name, idnum FROM order_members WHERE order_id = ?').all(order.id);
  res.json({ order: serializeOrder(order, items, members) });
});

module.exports = router;
