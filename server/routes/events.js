const express = require('express');
const db = require('../db');

const router = express.Router();

function attachItems(event) {
  const items = db
    .prepare('SELECT id, name, price FROM event_items WHERE event_id = ? ORDER BY sort_order')
    .all(event.id);
  return {
    id: event.id,
    status: event.status,
    title: event.title,
    dateLabel: event.date_label,
    date: event.event_date,
    place: event.place,
    tag: event.tag,
    desc: event.description,
    cover: event.cover,
    items,
  };
}

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM events ORDER BY sort_order').all();
  res.json({ events: rows.map(attachItems) });
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: '法会不存在' });
  res.json({ event: attachItems(row) });
});

module.exports = router;
