const db = require('./db');

function notifyUser(userId, { type, title, body, linkKind, linkId }) {
  db.prepare(`
    INSERT INTO notifications (user_id, type, title, body, link_kind, link_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, type, title, body, linkKind || null, linkId || null);
}

module.exports = { notifyUser };
