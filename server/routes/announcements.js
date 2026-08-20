const express = require('express');
const db = require('../db');

const router = express.Router();

function serialize(row) {
  return {
    id: row.id,
    badge: row.badge,
    title: row.title,
    body: row.body,
    linkKind: row.link_kind,
    linkId: row.link_id,
    createdAt: row.created_at,
  };
}

router.get('/', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM announcements WHERE active = 1 ORDER BY sort_order ASC, id DESC')
    .all();
  res.json({ announcements: rows.map(serialize) });
});

module.exports = router;
