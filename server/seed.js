const EVENTS = [
  {
    id: 'ev1', status: 'ongoing', title: '2027 新春新福法会',
    dateLabel: '2027年2月10日 (正月初五)', date: '2027-02-10', place: '灵一守玄坛',
    tag: '新春祈福 · 万事如意',
    desc: '法会当日于灵一守玄坛举行，诚心祈福，福慧圆满，家宅平安，万事顺遂。',
    cover: 'linear-gradient(135deg,#3a1712,#1a0e0c)',
    items: [
      { id: 'i1', name: '新春祈福', price: 50 },
      { id: 'i2', name: '补财库', price: 88 },
      { id: 'i3', name: '光明灯', price: 30 },
      { id: 'i4', name: '太岁灯', price: 30 },
      { id: 'i5', name: '消灾解厄', price: 50 },
      { id: 'i6', name: '添丁祈福', price: 50 },
      { id: 'i7', name: '婚缘祈福', price: 50 },
    ],
  },
  {
    id: 'ev2', status: 'ongoing', title: '太岁安春法会',
    dateLabel: '2027年1月25日 (腊月十八)', date: '2027-01-25', place: '灵一守玄坛',
    tag: '安太岁 · 求平安',
    desc: '安奉太岁，祈求本命年顺遂平安，化解冲犯，护佑全年吉祥。',
    cover: 'linear-gradient(135deg,#4a2312,#1a0e0c)',
    items: [
      { id: 'i8', name: '安太岁', price: 50 },
      { id: 'i9', name: '本命元辰灯', price: 40 },
      { id: 'i10', name: '化太岁符', price: 20 },
    ],
  },
  {
    id: 'ev3', status: 'upcoming', title: '中元普渡法会',
    dateLabel: '2027年8月15日 (七月十五)', date: '2027-08-15', place: '灵一守玄坛',
    tag: '普渡孤魂 · 超度亲人',
    desc: '普渡孤魂，超度亲人，化解怨结，广结善缘，冥阳两利。',
    cover: 'linear-gradient(135deg,#2a1a3a,#1a0e0c)',
    items: [
      { id: 'i11', name: '普渡登记', price: 30 },
      { id: 'i12', name: '超度亡魂', price: 80 },
      { id: 'i13', name: '往生牌位', price: 50 },
    ],
  },
  {
    id: 'ev4', status: 'ended', title: '2026 冬至团圆法会',
    dateLabel: '2026年12月21日 (冬至)', date: '2026-12-21', place: '灵一守玄坛',
    tag: '阖家团圆 · 添福添寿',
    desc: '冬至法会已圆满结束，感谢十方信众参与，功德无量。',
    cover: 'linear-gradient(135deg,#222,#111)',
    items: [
      { id: 'i14', name: '团圆祈福', price: 40 },
      { id: 'i15', name: '延寿灯', price: 60 },
    ],
  },
];

const PRAYER_CATEGORIES = [
  {
    id: 'c1', name: '财福事业', icon: 'coin', desc: '补财库、旺事业、招财纳福',
    types: [
      { id: 't1', name: '补财库疏文', desc: '补财库，旺财运，助偏正财', price: 88 },
      { id: 't2', name: '求财疏文', desc: '偏财旺运，求财顺遂', price: 60 },
      { id: 't3', name: '事业顺利疏文', desc: '事业稳步高升，贵人相助', price: 60 },
    ],
  },
  {
    id: 'c2', name: '消灾解厄', icon: 'shield', desc: '化解灾厄，趋吉避凶，家宅平安',
    types: [
      { id: 't4', name: '消灾解厄疏文', desc: '化解灾星、口舌、官非', price: 50 },
      { id: 't5', name: '家宅平安疏文', desc: '合家平安，出入顺遂', price: 50 },
    ],
  },
  {
    id: 'c3', name: '补运摄太岁', icon: 'star', desc: '安太岁、摄太岁，转运纳吉',
    types: [
      { id: 't6', name: '补财库摄太岁疏文', desc: '补财库，兼摄太岁，双重护佑', price: 88 },
      { id: 't7', name: '本命元辰疏文', desc: '本命元辰光彩，添福添寿', price: 50 },
    ],
  },
  {
    id: 'c4', name: '生基兴隆', icon: 'sprout', desc: '添丁兴旺，家宅兴隆，生基祈福',
    types: [
      { id: 't8', name: '生基兴隆疏文', desc: '旺宅旺人丁，家运兴隆', price: 50 },
      { id: 't9', name: '添丁祈福疏文', desc: '求子添丁，早生贵子', price: 50 },
    ],
  },
  {
    id: 'c5', name: '超度亡者', icon: 'lotus', desc: '超度亡魂，往生莲位，冥阳两利',
    types: [
      { id: 't10', name: '超度亡魂疏文', desc: '超度先人，往生善道', price: 80 },
      { id: 't11', name: '往生牌位疏文', desc: '设立往生牌位，四时香火', price: 50 },
    ],
  },
  {
    id: 'c6', name: '其他法事', icon: 'more', desc: '公司/店铺祈福，其他各类法事',
    types: [
      { id: 't12', name: '公司/店铺祈福疏文', desc: '开业大吉，生意兴隆', price: 50 },
      { id: 't13', name: '其他法事疏文', desc: '个性化法事，详情面议', price: 50 },
    ],
  },
];

const ANNOUNCEMENTS = [
  {
    id: 'a1', badge: '公告', title: '2027 新春新福法会 即将开始报名',
    body: '2027年2月10日 (正月初五) 举行，名额有限，点击查看详情并提前报名。',
    linkKind: 'event', linkId: 'ev1',
  },
  {
    id: 'a2', badge: '优惠', title: '中元普渡法会 提前报名享早鸟优惠',
    body: '即日起报名 2027 中元普渡法会，即可享有早鸟优惠价，欢迎提前登记。',
    linkKind: 'event', linkId: 'ev3',
  },
  {
    id: 'a3', badge: '优惠', title: '疏文办理 新用户首单立减 RM10',
    body: '首次办理疏文的信众，凭本次通知联系客服即可获得首单优惠，欢迎办理。',
    linkKind: 'prayers', linkId: null,
  },
];

function seedCatalog(db) {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM events').get();
  if (count > 0) return;

  const insertEvent = db.prepare(`
    INSERT INTO events (id, status, title, date_label, event_date, place, tag, description, cover, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertEventItem = db.prepare(`
    INSERT INTO event_items (id, event_id, name, price, sort_order) VALUES (?, ?, ?, ?, ?)
  `);
  const insertCategory = db.prepare(`
    INSERT INTO prayer_categories (id, name, icon, description, sort_order) VALUES (?, ?, ?, ?, ?)
  `);
  const insertType = db.prepare(`
    INSERT INTO prayer_types (id, category_id, name, description, price, sort_order) VALUES (?, ?, ?, ?, ?, ?)
  `);

  db.exec('BEGIN');
  try {
    EVENTS.forEach((e, ei) => {
      insertEvent.run(e.id, e.status, e.title, e.dateLabel, e.date, e.place, e.tag, e.desc, e.cover, ei);
      e.items.forEach((it, ii) => insertEventItem.run(it.id, e.id, it.name, it.price, ii));
    });
    PRAYER_CATEGORIES.forEach((c, ci) => {
      insertCategory.run(c.id, c.name, c.icon, c.desc, ci);
      c.types.forEach((t, ti) => insertType.run(t.id, c.id, t.name, t.desc, t.price, ti));
    });
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function seedAnnouncements(db) {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM announcements').get();
  if (count > 0) return;

  const insert = db.prepare(`
    INSERT INTO announcements (id, badge, title, body, link_kind, link_id, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  ANNOUNCEMENTS.forEach((a, i) => insert.run(a.id, a.badge, a.title, a.body, a.linkKind, a.linkId, i));
}

function seedAdmin(db) {
  const bcrypt = require('bcryptjs');
  const { count } = db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'").get();
  if (count > 0) return;

  const email = (process.env.ADMIN_EMAIL || 'admin@lyszt.local').trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(existing.id);
    return;
  }

  const password = process.env.ADMIN_PASSWORD || require('crypto').randomBytes(9).toString('base64url');
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(`
    INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, 'admin')
  `).run('管理员', email, null, hash);

  console.log('==============================================');
  console.log(' Created default admin account:');
  console.log('   email:    ' + email);
  console.log('   password: ' + password);
  console.log(' Log in at /admin and change this immediately.');
  console.log(' Set ADMIN_EMAIL / ADMIN_PASSWORD env vars to avoid this message.');
  console.log('==============================================');
}

module.exports = function seed(db) {
  seedCatalog(db);
  seedAnnouncements(db);
  seedAdmin(db);
};
