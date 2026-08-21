const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken, authMiddleware } = require('../auth');
const { notifyUser } = require('../notify');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicUser(row) {
  return {
    id: row.id, name: row.name, email: row.email, phone: row.phone, role: row.role, createdAt: row.created_at,
    dobType: row.dob_type, dob: row.dob, dobYear: row.dob_year, dobMonth: row.dob_month, dobDay: row.dob_day,
    dobLeap: !!row.dob_leap,
  };
}

router.post('/register', (req, res) => {
  const { name, email, phone, password } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: '请输入姓名' });
  if (!email || !EMAIL_RE.test(String(email).trim())) return res.status(400).json({ error: '请输入有效的邮箱' });
  if (!password || String(password).length < 6) return res.status(400).json({ error: '密码至少需要 6 位' });

  const emailNorm = String(email).trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(emailNorm);
  if (existing) return res.status(409).json({ error: '该邮箱已被注册' });

  const passwordHash = bcrypt.hashSync(String(password), 10);
  const info = db
    .prepare('INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)')
    .run(String(name).trim(), emailNorm, phone ? String(phone).trim() : null, passwordHash);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  notifyUser(user.id, {
    type: 'welcome',
    title: '欢迎加入灵一守玄坛',
    body: '诚心所愿，玄坛护佑。您现在可以报名法会、办理疏文，并随时查看订单记录。',
  });
  const token = signToken(user);
  res.status(201).json({ token, user: publicUser(user) });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: '请输入邮箱与密码' });

  const emailNorm = String(email).trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(emailNorm);
  if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
    return res.status(401).json({ error: '邮箱或密码不正确' });
  }

  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json({ user: publicUser(user) });
});

router.put('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: '用户不存在' });

  const { name, phone, currentPassword, newPassword, dobType, dob, dobYear, dobMonth, dobDay, dobLeap } = req.body || {};
  let passwordHash = user.password_hash;
  if (newPassword) {
    if (!currentPassword || !bcrypt.compareSync(String(currentPassword), user.password_hash)) {
      return res.status(401).json({ error: '当前密码不正确' });
    }
    if (String(newPassword).length < 6) return res.status(400).json({ error: '新密码至少需要 6 位' });
    passwordHash = bcrypt.hashSync(String(newPassword), 10);
  }

  const hasDobUpdate = dobType !== undefined;

  db.prepare(`
    UPDATE users SET name = ?, phone = ?, password_hash = ?,
      dob_type = ?, dob = ?, dob_year = ?, dob_month = ?, dob_day = ?, dob_leap = ?
    WHERE id = ?
  `).run(
    name !== undefined && String(name).trim() ? String(name).trim() : user.name,
    phone !== undefined ? String(phone).trim() : user.phone,
    passwordHash,
    hasDobUpdate ? dobType : user.dob_type,
    hasDobUpdate ? dob : user.dob,
    hasDobUpdate ? (dobYear ?? null) : user.dob_year,
    hasDobUpdate ? (dobMonth ?? null) : user.dob_month,
    hasDobUpdate ? (dobDay ?? null) : user.dob_day,
    hasDobUpdate ? (dobLeap ? 1 : 0) : user.dob_leap,
    user.id
  );

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  res.json({ user: publicUser(updated) });
});

module.exports = router;
