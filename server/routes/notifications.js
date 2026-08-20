const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../auth');

const router = express.Router();
router.use(authMiddleware);

function serialize(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    linkKind: row.link_kind,
    linkId: row.link_id,
    isRead: !!row.is_read,
    createdAt: row.created_at,
  };
}

router.get('/', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 100')
    .all(req.userId);
  const unreadCount = db
    .prepare('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0')
    .get(req.userId).c;
  res.json({ notifications: rows.map(serialize), unreadCount });
});

router.post('/:id/read', (req, res) => {
  const info = db
    .prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.userId);
  if (info.changes === 0) return res.status(404).json({ error: '通知不存在' });
  res.json({ ok: true });
});

router.post('/read-all', (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0').run(req.userId);
  res.json({ ok: true });
});

module.exports = router;
