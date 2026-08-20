const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/categories', (req, res) => {
  const categories = db.prepare('SELECT * FROM prayer_categories ORDER BY sort_order').all();
  const types = db.prepare('SELECT * FROM prayer_types ORDER BY sort_order').all();
  const result = categories.map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    desc: c.description,
    types: types
      .filter((t) => t.category_id === c.id)
      .map((t) => ({ id: t.id, name: t.name, desc: t.description, price: t.price, categoryId: c.id, categoryName: c.name })),
  }));
  res.json({ categories: result });
});

router.get('/categories/:id', (req, res) => {
  const c = db.prepare('SELECT * FROM prayer_categories WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: '分类不存在' });
  const types = db
    .prepare('SELECT * FROM prayer_types WHERE category_id = ? ORDER BY sort_order')
    .all(c.id)
    .map((t) => ({ id: t.id, name: t.name, desc: t.description, price: t.price, categoryId: c.id, categoryName: c.name }));
  res.json({ category: { id: c.id, name: c.name, icon: c.icon, desc: c.description, types } });
});

router.get('/types/:id', (req, res) => {
  const t = db.prepare('SELECT * FROM prayer_types WHERE id = ?').get(req.params.id);
  if (!t) return res.status(404).json({ error: '疏文不存在' });
  const c = db.prepare('SELECT * FROM prayer_categories WHERE id = ?').get(t.category_id);
  res.json({
    type: { id: t.id, name: t.name, desc: t.description, price: t.price, categoryId: c.id, categoryName: c.name },
  });
});

module.exports = router;
