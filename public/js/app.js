/* 灵一守玄坛 — app shell, router, screens (API-backed) */

const app = document.getElementById('app');
const tabbar = document.getElementById('tabbar');

let EVENTS_CACHE = null;
let PRAYERS_CACHE = null;
let pendingNav = null;
let renderToken = 0;

/* ---------- helpers ---------- */

function fmt(n) { return `RM ${Number(n).toFixed(2)}`; }

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 1800);
}

function nav(hash) { location.hash = hash; }

async function ensureEvents() {
  if (!EVENTS_CACHE) EVENTS_CACHE = (await api('/events')).events;
  return EVENTS_CACHE;
}
async function ensurePrayers() {
  if (!PRAYERS_CACHE) PRAYERS_CACHE = (await api('/prayers/categories')).categories;
  return PRAYERS_CACHE;
}

function icon(name) {
  const paths = {
    coin: '<circle cx="12" cy="12" r="9"/><path d="M9 9h4a2 2 0 0 1 0 4H9m0-4v6m0-2h4"/>',
    shield: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z"/>',
    star: '<path d="M12 3l2.6 5.9L21 9.6l-4.7 4.1L17.6 21 12 17.6 6.4 21l1.3-7.3L3 9.6l6.4-.7L12 3Z"/>',
    sprout: '<path d="M12 21v-8"/><path d="M12 13c0-4 3-6 7-6 0 4-3 7-7 7Z"/><path d="M12 13c0-3-2.5-5-6-5 0 3.5 2.5 6 6 6Z"/>',
    lotus: '<path d="M12 21c-4-1-6-4-6-8 3 0 5 2 6 4 1-2 3-4 6-4 0 4-2 7-6 8Z"/><path d="M12 13V8"/>',
    more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    bell: '<path d="M6 9a6 6 0 0 1 12 0v5l1.5 3h-15L6 14V9Z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    reg: '<path d="M5 4h11l3 3v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"/><path d="M9 10h6M9 14h6"/>',
    doc: '<path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M9 12h6M9 16h6M9 8h3"/>',
    online: '<rect x="3" y="5" width="18" height="13" rx="2"/><path d="M8 21h8M12 18v3"/>',
    save: '<path d="M5 4h11l3 3v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"/><path d="M8 4v6h8V4"/>',
    gen: '<path d="M4 6h16M4 12h10M4 18h7"/>',
    orders: '<path d="M4 7h16l-1.5 12.2a1 1 0 0 1-1 .8H6.5a1 1 0 0 1-1-.8L4 7Z"/><path d="M8 7V6a4 4 0 0 1 8 0v1"/>',
    remind: '<path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M12 4v16"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4.5 5-6 8-6s6.5 1.5 8 6"/>',
    lock: '<rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    cs: '<path d="M4 12a8 8 0 1 1 16 0v5a2 2 0 0 1-2 2h-1v-6h3M4 17v-5h3v6H6a2 2 0 0 1-2-2Z"/>',
    about: '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/>',
    logout: '<path d="M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none">${paths[name] || ''}</svg>`;
}

function header(title, opts = {}) {
  return `
  <div class="page-header">
    ${opts.back ? `<button class="icon-btn back" data-nav="${opts.back}">${icon('back')}</button>` : ''}
    <h1>${title}</h1>
    ${opts.right ? opts.right : ''}
  </div>`;
}

function emptyStateHtml(msg) {
  return `<div class="empty-state"><div class="es-icon">✦</div><div>${msg}</div></div>`;
}

function loadingHtml(title, back) {
  return header(title, { back }) + `<div class="page-body">${emptyStateHtml('加载中…')}</div>`;
}

function errorHtml(title, back, msg) {
  return header(title, { back }) + `<div class="page-body">${emptyStateHtml(msg || '加载失败，请重试')}</div>`;
}

function requireAuth(nextHash) {
  if (!isLoggedIn()) {
    pendingNav = nextHash;
    nav('#/login');
    return false;
  }
  return true;
}

/* ================= ROUTER ================= */

const routes = [
  [/^#\/home$/, () => renderHome()],
  [/^#\/events$/, () => renderEvents()],
  [/^#\/events\/([^/]+)$/, (m) => renderEventDetail(m[1])],
  [/^#\/events\/([^/]+)\/apply$/, (m) => renderApplyForm('event', m[1])],
  [/^#\/prayers$/, () => renderPrayerCategories()],
  [/^#\/prayers\/([^/]+)$/, (m) => renderPrayerTypes(m[1])],
  [/^#\/prayer-apply\/([^/]+)$/, (m) => renderApplyForm('prayer', m[1])],
  [/^#\/confirm$/, () => renderConfirm()],
  [/^#\/success\/([^/]+)$/, (m) => renderSuccess(m[1])],
  [/^#\/orders$/, () => renderOrders()],
  [/^#\/orders\/([^/]+)$/, (m) => renderOrderDetail(m[1])],
  [/^#\/me$/, () => renderMe()],
  [/^#\/login$/, () => renderLogin()],
  [/^#\/register$/, () => renderRegister()],
];

function router() {
  renderToken++;
  const hash = location.hash || '#/home';
  for (const [re, fn] of routes) {
    const m = hash.match(re);
    if (m) { fn(m); syncTabbar(hash); window.scrollTo(0, 0); return; }
  }
  nav('#/home');
}

function syncTabbar(hash) {
  let key = '#/home';
  if (hash.startsWith('#/events')) key = '#/events';
  else if (hash.startsWith('#/prayers') || hash.startsWith('#/prayer-apply')) key = '#/prayers';
  else if (hash.startsWith('#/orders')) key = '#/orders';
  else if (hash.startsWith('#/me') || hash.startsWith('#/login') || hash.startsWith('#/register')) key = '#/me';

  const hideTabbar = hash.startsWith('#/confirm') || hash.startsWith('#/success');
  tabbar.style.display = hideTabbar ? 'none' : 'flex';
  [...tabbar.children].forEach((b) => b.classList.toggle('active', b.dataset.route === key));
}

window.addEventListener('hashchange', router);
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-nav]');
  if (t) nav(t.dataset.nav);
});
tabbar.addEventListener('click', (e) => {
  const b = e.target.closest('.tab-btn');
  if (b) nav(b.dataset.route);
});

/* ================= HOME ================= */

async function renderHome() {
  const myToken = renderToken;
  app.innerHTML = loadingHtml('灵一守玄坛');
  let events;
  try { events = await ensureEvents(); } catch (e) { if (myToken === renderToken) app.innerHTML = errorHtml('灵一守玄坛', null, e.message); return; }
  if (myToken !== renderToken) return;

  const ongoing = events.filter((e) => e.status !== 'ended').slice(0, 2);
  app.innerHTML = `
    ${header('灵一守玄坛', { right: `<button class="icon-btn" data-nav="#/orders">${icon('bell')}</button>` })}
    <div class="page-body">
      <div class="hero">
        <div class="hero-eyebrow">诚心所愿 · 玄坛护佑</div>
        <div class="hero-title">道法自然 · 玄坛护佑 · 福泽众生</div>
        <div class="hero-sub">法会报名与疏文办理，一站式线上办理</div>
      </div>

      <div class="quick-actions">
        <div class="quick-card primary" data-nav="#/events">
          <div class="qc-icon">${icon('reg')}</div>
          <div>
            <div class="qc-title">法会报名</div>
            <div class="qc-sub">参与法会，积福纳祥</div>
          </div>
        </div>
        <div class="quick-card secondary" data-nav="#/prayers">
          <div class="qc-icon">${icon('doc')}</div>
          <div>
            <div class="qc-title">疏文办理</div>
            <div class="qc-sub">线上办理，方便快捷</div>
          </div>
        </div>
      </div>

      <div class="feature-strip">
        <div class="fi">${icon('online')}<span>在线支付</span></div>
        <div class="fi">${icon('save')}<span>资料保存</span></div>
        <div class="fi">${icon('gen')}<span>自动生成疏文</span></div>
        <div class="fi">${icon('orders')}<span>订单管理</span></div>
        <div class="fi">${icon('remind')}<span>法会提醒</span></div>
      </div>

      <div class="section-title"><h2>近期法会</h2><span class="link" data-nav="#/events">查看更多 ›</span></div>
      ${ongoing.map(eventCardHtml).join('')}
    </div>
  `;
}

function eventCardHtml(e) {
  const statusLabel = { ongoing: '进行中', upcoming: '即将开始', ended: '已结束' }[e.status];
  return `
  <div class="event-card" data-nav="#/events/${e.id}">
    <div class="ec-banner" style="background:${e.cover}">
      <span class="status-pill ${e.status === 'ended' ? 'ended' : ''}">${statusLabel}</span>
      <span class="ec-title">${e.title}</span>
    </div>
    <div class="ec-body">
      <div class="ec-date">${e.dateLabel}</div>
      <div class="ec-tag">${e.tag}</div>
      <div class="ec-foot">
        <span class="ec-place">${e.place}</span>
        ${e.status === 'ended'
          ? `<button class="btn ghost sm" disabled>已结束</button>`
          : `<button class="btn sm">立即报名</button>`}
      </div>
    </div>
  </div>`;
}

/* ================= EVENTS LIST ================= */

let eventsFilter = 'ongoing';

async function renderEvents() {
  const myToken = renderToken;
  app.innerHTML = loadingHtml('法会活动');
  let events;
  try { events = await ensureEvents(); } catch (e) { if (myToken === renderToken) app.innerHTML = errorHtml('法会活动', null, e.message); return; }
  if (myToken !== renderToken) return;

  const tabs = [['ongoing', '进行中'], ['upcoming', '即将开始'], ['ended', '已结束']];
  const list = events.filter((e) => e.status === eventsFilter);
  app.innerHTML = `
    ${header('法会活动')}
    <div class="page-body">
      <div class="tabs-row">
        ${tabs.map(([k, l]) => `<div class="tab-chip ${eventsFilter === k ? 'active' : ''}" data-filter="${k}">${l}</div>`).join('')}
      </div>
      <div id="events-list">
        ${list.length ? list.map(eventCardHtml).join('') : emptyStateHtml('暂无相关法会')}
      </div>
    </div>
  `;
  app.querySelectorAll('.tab-chip').forEach((c) => {
    c.addEventListener('click', () => { eventsFilter = c.dataset.filter; renderEvents(); });
  });
}

/* ================= EVENT DETAIL ================= */

let eventSelections = {}; // eventId -> Set of item ids

async function renderEventDetail(id) {
  const myToken = renderToken;
  app.innerHTML = loadingHtml('法会详情', '#/events');
  let events;
  try { events = await ensureEvents(); } catch (e) { if (myToken === renderToken) app.innerHTML = errorHtml('法会详情', '#/events', e.message); return; }
  if (myToken !== renderToken) return;

  const e = events.find((ev) => ev.id === id);
  if (!e) { nav('#/events'); return; }
  if (!eventSelections[id]) eventSelections[id] = new Set(e.items.map((i) => i.id));

  const sel = eventSelections[id];
  const total = e.items.filter((i) => sel.has(i.id)).reduce((s, i) => s + i.price, 0);

  app.innerHTML = `
    ${header(e.title, { back: `#/events` })}
    <div class="page-body">
      <div class="detail-cover" style="background:${e.cover}"><div class="dc-title">${e.title}</div></div>
      <div class="info-card">
        <div><b>法会日期：</b>${e.dateLabel}</div>
        <div><b>法会地点：</b>${e.place}</div>
        <div class="desc">${e.desc}</div>
      </div>
      <div class="section-title"><h2>请勾选参与的项目 (可多选)</h2></div>
      <div class="item-list">
        ${e.items.map((it) => `
          <div class="item-row" data-toggle="${it.id}">
            <div class="checkbox ${sel.has(it.id) ? 'checked' : ''}">${icon('check')}</div>
            <div class="it-name">${it.name}</div>
            <div class="it-price">${fmt(it.price)}</div>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="bottom-bar">
      <div class="total">已选 ${sel.size} 项，合计：<b>${fmt(total)}</b></div>
      <button class="btn gold" id="next-btn" ${sel.size === 0 ? 'disabled' : ''}>下一步</button>
    </div>
  `;

  app.querySelectorAll('[data-toggle]').forEach((row) => {
    row.addEventListener('click', () => {
      const id2 = row.dataset.toggle;
      if (sel.has(id2)) sel.delete(id2); else sel.add(id2);
      renderEventDetail(id);
    });
  });

  const nextBtn = document.getElementById('next-btn');
  if (nextBtn) nextBtn.addEventListener('click', () => {
    newCart('event', e);
    STATE.cart.items = e.items.filter((i) => sel.has(i.id)).map((i) => ({ id: i.id, name: i.name, price: i.price, qty: 1 }));
    nav(`#/events/${id}/apply`);
  });
}

/* ================= PRAYER CATEGORIES ================= */

async function renderPrayerCategories() {
  const myToken = renderToken;
  app.innerHTML = loadingHtml('疏文办理');
  let categories;
  try { categories = await ensurePrayers(); } catch (e) { if (myToken === renderToken) app.innerHTML = errorHtml('疏文办理', null, e.message); return; }
  if (myToken !== renderToken) return;

  app.innerHTML = `
    ${header('疏文办理')}
    <div class="page-body">
      <div class="section-title"><h2>请选择疏文分类</h2></div>
      <div class="cat-grid">
        ${categories.map((c) => `
          <div class="cat-card" data-nav="#/prayers/${c.id}">
            <div class="cat-icon">${icon(c.icon)}</div>
            <div class="cat-name">${c.name}</div>
            <div class="cat-desc">${c.desc}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

async function renderPrayerTypes(catId) {
  const myToken = renderToken;
  app.innerHTML = loadingHtml('疏文办理', '#/prayers');
  let categories;
  try { categories = await ensurePrayers(); } catch (e) { if (myToken === renderToken) app.innerHTML = errorHtml('疏文办理', '#/prayers', e.message); return; }
  if (myToken !== renderToken) return;

  const c = categories.find((x) => x.id === catId);
  if (!c) { nav('#/prayers'); return; }
  app.innerHTML = `
    ${header(c.name, { back: '#/prayers' })}
    <div class="page-body">
      <div class="section-title"><h2>选择疏文</h2></div>
      ${c.types.map((t) => `
        <div class="type-card">
          <div class="ty-icon">${icon(c.icon)}</div>
          <div class="ty-main">
            <div class="ty-name">${t.name}</div>
            <div class="ty-desc">${t.desc}</div>
            <div class="ty-price">${fmt(t.price)}</div>
          </div>
          <button class="add-btn" data-type="${t.id}">${icon('plus')}</button>
        </div>
      `).join('')}
    </div>
  `;
  app.querySelectorAll('[data-type]').forEach((b) => {
    b.addEventListener('click', () => nav(`#/prayer-apply/${b.dataset.type}`));
  });
}

/* ================= APPLY / FILL INFO FORM ================= */

async function renderApplyForm(kind, refId) {
  if (!requireAuth(`#/${kind === 'event' ? `events/${refId}/apply` : `prayer-apply/${refId}`}`)) return;

  const myToken = renderToken;
  let title, items;

  if (kind === 'event') {
    app.innerHTML = loadingHtml('填写资料', `#/events/${refId}`);
    let events;
    try { events = await ensureEvents(); } catch (e) { if (myToken === renderToken) app.innerHTML = errorHtml('填写资料', `#/events/${refId}`, e.message); return; }
    if (myToken !== renderToken) return;
    const e = events.find((ev) => ev.id === refId);
    if (!e || !STATE.cart || STATE.cart.kind !== 'event') { nav(`#/events/${refId}`); return; }
    title = e.title;
    items = STATE.cart.items;
  } else {
    app.innerHTML = loadingHtml('填写资料', '#/prayers');
    let categories;
    try { categories = await ensurePrayers(); } catch (e) { if (myToken === renderToken) app.innerHTML = errorHtml('填写资料', '#/prayers', e.message); return; }
    if (myToken !== renderToken) return;
    const t = findPrayerType(categories, refId);
    if (!t) { nav('#/prayers'); return; }
    if (!STATE.cart || STATE.cart.kind !== 'prayer' || STATE.cart.refId !== t.id) {
      newCart('prayer', t);
      STATE.cart.items = [{ id: t.id, name: t.name, price: t.price, qty: 1 }];
    }
    title = t.name;
    items = STATE.cart.items;
  }

  const main = STATE.cart.main || { name: STATE.auth.user?.name || '', phone: STATE.auth.user?.phone || '' };
  const members = STATE.cart.members || [];
  const total = cartTotal();

  app.innerHTML = `
    ${header('填写资料', { back: kind === 'event' ? `#/events/${refId}` : '#/prayers' })}
    <div class="page-body">
      <div class="form-card">
        <div class="fc-title">已选：${items.map((i) => i.name).join('、')} · ${fmt(total)}</div>
      </div>

      <div class="form-card">
        <div class="fc-title">主事人资料</div>
        <div class="field"><label>姓名</label><input id="f-name" placeholder="请输入姓名" value="${main.name || ''}" /></div>
        <div class="field"><label>身份证号</label><input id="f-idnum" placeholder="请输入身份证号" value="${main.idnum || ''}" /></div>
        <div class="field"><label>出生日期</label><input id="f-dob" type="date" value="${main.dob || ''}" /></div>
        <div class="field"><label>联系地址</label><input id="f-addr" placeholder="请输入联系地址" value="${main.addr || ''}" /></div>
        <div class="field"><label>联系电话</label><input id="f-phone" placeholder="请输入联系电话" value="${main.phone || ''}" /></div>
      </div>

      <div class="form-card">
        <div class="fc-title">添加家人 (可选)</div>
        <div id="member-list">
          ${members.map((m, i) => `
            <div class="member-row">
              <div><div class="mr-name">${m.name}</div><div class="mr-meta">${m.idnum || ''}</div></div>
              <div class="mr-del" data-del-member="${i}">删除</div>
            </div>
          `).join('')}
        </div>
        <div class="add-member-btn" id="add-member-btn">${icon('plus')} 为家人一键添福</div>
      </div>
    </div>
    <div class="bottom-bar">
      <div class="total">合计：<b>${fmt(total)}</b></div>
      <button class="btn gold" id="to-confirm">下一步</button>
    </div>
  `;

  document.getElementById('add-member-btn').addEventListener('click', () => {
    const name = prompt('请输入家人姓名');
    if (!name) return;
    STATE.cart.members = STATE.cart.members || [];
    STATE.cart.members.push({ name, idnum: '' });
    renderApplyForm(kind, refId);
  });

  app.querySelectorAll('[data-del-member]').forEach((b) => {
    b.addEventListener('click', () => {
      STATE.cart.members.splice(Number(b.dataset.delMember), 1);
      renderApplyForm(kind, refId);
    });
  });

  document.getElementById('to-confirm').addEventListener('click', () => {
    const name = document.getElementById('f-name').value.trim();
    const phone = document.getElementById('f-phone').value.trim();
    if (!name || !phone) { toast('请填写姓名与联系电话'); return; }
    STATE.cart.main = {
      name,
      idnum: document.getElementById('f-idnum').value.trim(),
      dob: document.getElementById('f-dob').value,
      addr: document.getElementById('f-addr').value.trim(),
      phone,
    };
    nav('#/confirm');
  });
}

/* ================= CONFIRM ORDER ================= */

let payMethod = 'fpx';

function renderConfirm() {
  if (!requireAuth('#/confirm')) return;
  if (!STATE.cart || !STATE.cart.main) { nav('#/home'); return; }
  const cart = STATE.cart;
  const total = cartTotal();
  const methods = [
    ['fpx', 'FPX Online Banking'],
    ['grabpay', 'GrabPay'],
    ['tng', "Touch 'n Go eWallet"],
  ];

  app.innerHTML = `
    <div class="page-header">
      <button class="icon-btn back" id="confirm-back">${icon('back')}</button>
      <h1>确认订单</h1>
    </div>
    <div class="page-body">
      <div class="form-card">
        <div class="fc-title">${cart.refTitle}</div>
        ${cart.items.map((i) => `<div class="summary-row"><span>${i.name}</span><span>${fmt(i.price)}</span></div>`).join('')}
      </div>

      <div class="form-card">
        <div class="fc-title">主事人资料</div>
        <div class="detail-list-row"><span>姓名</span><b>${cart.main.name}</b></div>
        <div class="detail-list-row"><span>身份证号</span><b>${cart.main.idnum || '-'}</b></div>
        <div class="detail-list-row"><span>出生日期</span><b>${cart.main.dob || '-'}</b></div>
        <div class="detail-list-row"><span>联系地址</span><b>${cart.main.addr || '-'}</b></div>
        <div class="detail-list-row"><span>联系电话</span><b>${cart.main.phone}</b></div>
        ${cart.members.length ? `<div class="detail-list-row"><span>添加家人</span><b>${cart.members.map((m) => m.name).join('、')}</b></div>` : ''}
      </div>

      <div class="form-card">
        <div class="fc-title">付款方式</div>
        ${methods.map(([k, l]) => `
          <div class="pay-method ${payMethod === k ? 'selected' : ''}" data-pm="${k}">
            <div class="pm-icon">${l[0]}</div>
            <div class="pm-name">${l}</div>
            <div class="pm-radio"></div>
          </div>
        `).join('')}
      </div>

      <div class="form-card">
        <div class="summary-row"><span>合计金额</span><span>${fmt(total)}</span></div>
        <div class="summary-row total"><span>应付</span><b>${fmt(total)}</b></div>
      </div>
    </div>
    <div class="page-body" style="padding-top:0">
      <button class="btn gold block" id="pay-btn">确认付款 ${fmt(total)}</button>
    </div>
  `;

  document.getElementById('confirm-back').addEventListener('click', () => history.back());

  app.querySelectorAll('[data-pm]').forEach((row) => {
    row.addEventListener('click', () => { payMethod = row.dataset.pm; renderConfirm(); });
  });

  document.getElementById('pay-btn').addEventListener('click', async () => {
    const btn = document.getElementById('pay-btn');
    btn.setAttribute('disabled', 'true');
    btn.textContent = '处理中…';
    try {
      const { order } = await api('/orders', {
        method: 'POST',
        body: {
          kind: cart.kind,
          refId: cart.refId,
          refTitle: cart.refTitle,
          items: cart.items,
          main: cart.main,
          members: cart.members,
          payMethod,
        },
      });
      STATE.cart = null;
      nav(`#/success/${order.id}`);
    } catch (err) {
      toast(err.message || '下单失败，请重试');
      btn.removeAttribute('disabled');
      btn.textContent = `确认付款 ${fmt(total)}`;
    }
  });
}

/* ================= PAYMENT SUCCESS ================= */

async function renderSuccess(orderNo) {
  if (!requireAuth(`#/success/${orderNo}`)) return;
  const myToken = renderToken;
  app.innerHTML = loadingHtml('付款成功');
  let order;
  try { ({ order } = await api(`/orders/${orderNo}`)); } catch (e) { if (myToken === renderToken) nav('#/home'); return; }
  if (myToken !== renderToken) return;

  const methodLabel = { fpx: 'FPX Online Banking', grabpay: 'GrabPay', tng: "Touch 'n Go eWallet" }[order.payMethod];
  app.innerHTML = `
    ${header('付款成功')}
    <div class="page-body">
      <div class="success-wrap">
        <div class="success-icon">${icon('check')}</div>
        <div class="success-title">付款成功！</div>
        <div class="success-sub">感谢您的参与，功德无量，法会圆满。</div>
        <div class="receipt">
          <div class="r-row"><span>订单编号</span><b>${order.id}</b></div>
          <div class="r-row"><span>法会/事项</span><b>${order.title}</b></div>
          <div class="r-row"><span>金额</span><b>${fmt(order.total)}</b></div>
          <div class="r-row"><span>付款方式</span><b>${methodLabel}</b></div>
          <div class="r-row"><span>付款时间</span><b>${new Date(order.createdAt.replace(' ', 'T') + 'Z').toLocaleString('zh-CN', { hour12: false })}</b></div>
        </div>
        <button class="btn gold block" data-nav="#/orders/${order.id}" style="margin-bottom:10px">查看订单</button>
        <button class="btn ghost block" data-nav="#/home">返回首页</button>
      </div>
    </div>
  `;
}

/* ================= ORDERS ================= */

let orderFilter = 'all';

async function renderOrders() {
  if (!requireAuth('#/orders')) return;
  const myToken = renderToken;
  app.innerHTML = loadingHtml('我的订单');
  let orders;
  try { ({ orders } = await api('/orders')); } catch (e) { if (myToken === renderToken) app.innerHTML = errorHtml('我的订单', null, e.message); return; }
  if (myToken !== renderToken) return;

  const filters = [['all', '全部'], ['paid', '已付款'], ['pending', '待付款']];
  const list = orderFilter === 'all' ? orders : orders.filter((o) => o.status === orderFilter);
  app.innerHTML = `
    ${header('我的订单')}
    <div class="page-body">
      <div class="order-filter-row">
        ${filters.map(([k, l]) => `<div class="of-chip ${orderFilter === k ? 'active' : ''}" data-of="${k}">${l}</div>`).join('')}
      </div>
      ${list.length ? list.map(orderCardHtml).join('') : emptyStateHtml('暂无订单记录')}
    </div>
  `;
  app.querySelectorAll('[data-of]').forEach((c) => c.addEventListener('click', () => { orderFilter = c.dataset.of; renderOrders(); }));
}

function orderCardHtml(o) {
  return `
  <div class="order-card" data-nav="#/orders/${o.id}">
    <div class="oc-head">
      <div class="oc-title">${o.title}</div>
      <div class="oc-status ${o.status}">${o.status === 'paid' ? '已付款' : '待付款'}</div>
    </div>
    <div class="oc-meta">订单编号：${o.id} · ${o.createdAt.slice(0, 10)}</div>
    <div class="oc-foot">
      <span style="font-size:11px;color:var(--text-faint)">${o.items.length} 项，主事人：${o.main.name}</span>
      <span class="oc-amt">${fmt(o.total)}</span>
    </div>
  </div>`;
}

async function renderOrderDetail(orderNo) {
  if (!requireAuth(`#/orders/${orderNo}`)) return;
  const myToken = renderToken;
  app.innerHTML = loadingHtml('订单详情', '#/orders');
  let order;
  try { ({ order } = await api(`/orders/${orderNo}`)); } catch (e) { if (myToken === renderToken) app.innerHTML = errorHtml('订单详情', '#/orders', e.message); return; }
  if (myToken !== renderToken) return;

  const methodLabel = { fpx: 'FPX Online Banking', grabpay: 'GrabPay', tng: "Touch 'n Go eWallet" }[order.payMethod];
  app.innerHTML = `
    ${header('订单详情', { back: '#/orders' })}
    <div class="page-body">
      <div class="form-card">
        <div class="fc-title">${order.title}</div>
        ${order.items.map((i) => `<div class="summary-row"><span>${i.name}</span><span>${fmt(i.price)}</span></div>`).join('')}
        <div class="summary-row total"><span>合计</span><b>${fmt(order.total)}</b></div>
      </div>
      <div class="form-card">
        <div class="fc-title">主事人资料</div>
        <div class="detail-list-row"><span>姓名</span><b>${order.main.name}</b></div>
        <div class="detail-list-row"><span>身份证号</span><b>${order.main.idnum || '-'}</b></div>
        <div class="detail-list-row"><span>联系电话</span><b>${order.main.phone}</b></div>
        ${order.members.length ? `<div class="detail-list-row"><span>家人</span><b>${order.members.map((m) => m.name).join('、')}</b></div>` : ''}
      </div>
      <div class="form-card">
        <div class="fc-title">订单信息</div>
        <div class="detail-list-row"><span>订单编号</span><b>${order.id}</b></div>
        <div class="detail-list-row"><span>下单时间</span><b>${order.createdAt}</b></div>
        <div class="detail-list-row"><span>付款方式</span><b>${methodLabel}</b></div>
        <div class="detail-list-row"><span>订单状态</span><b>${order.status === 'paid' ? '已付款' : '待付款'}</b></div>
      </div>
      <button class="btn ghost block" data-nav="#/orders">返回订单列表</button>
    </div>
  `;
}

/* ================= ME ================= */

function renderMe() {
  if (!isLoggedIn()) {
    app.innerHTML = `
      ${header('我的')}
      <div class="page-body">
        <div class="empty-state">
          <div class="es-icon">${'✦'}</div>
          <div>登录后即可报名法会、办理疏文并查看订单</div>
        </div>
        <button class="btn gold block" data-nav="#/login" style="margin-bottom:10px">登录</button>
        <button class="btn ghost block" data-nav="#/register">注册新账号</button>
      </div>
    `;
    return;
  }

  const user = STATE.auth.user;
  const menu = [
    ['user', '我的资料'],
    ['orders', '办理记录 / 疏文查询'],
    ['remind', '法会提醒'],
    ['cs', '联系客服'],
    ['about', '关于我们'],
  ];
  app.innerHTML = `
    ${header('我的')}
    <div class="page-body">
      <div class="profile-hero">
        <div class="profile-avatar">${(user.name || '信')[0]}</div>
        <div>
          <div class="profile-name">${user.name}</div>
          <div class="profile-sub">${user.phone || user.email}</div>
        </div>
      </div>
      <div class="menu-list">
        ${menu.map(([ic, label]) => `
          <div class="menu-item" ${label.includes('办理记录') ? 'data-nav="#/orders"' : ''}>
            ${icon(ic)}<span>${label}</span><span class="mi-arrow">›</span>
          </div>
        `).join('')}
        <div class="menu-item" id="logout-btn">${icon('logout')}<span>退出登录</span><span class="mi-arrow">›</span></div>
      </div>
      <div class="trust-strip">
        <div class="ti">${icon('online')}<span>随时随地办法会</span></div>
        <div class="ti">${icon('lock')}<span>资料自动保存</span></div>
        <div class="ti">${icon('gen')}<span>疏文自动生成</span></div>
        <div class="ti">${icon('save')}<span>安全付款</span></div>
        <div class="ti">${icon('orders')}<span>订单随时查询</span></div>
      </div>
    </div>
  `;
  document.getElementById('logout-btn').addEventListener('click', () => {
    clearAuth();
    toast('已退出登录');
    nav('#/home');
  });
}

/* ================= LOGIN / REGISTER ================= */

function renderLogin() {
  app.innerHTML = `
    ${header('登录', { back: '#/me' })}
    <div class="page-body">
      <div class="hero" style="margin-bottom:20px">
        <div class="hero-eyebrow">灵一守玄坛</div>
        <div class="hero-title" style="font-size:16px">欢迎回来</div>
        <div class="hero-sub">登录后即可报名法会、办理疏文</div>
      </div>
      <div class="form-card">
        <div class="field"><label>邮箱</label><input id="l-email" type="email" placeholder="请输入邮箱" /></div>
        <div class="field"><label>密码</label><input id="l-password" type="password" placeholder="请输入密码" /></div>
      </div>
      <button class="btn gold block" id="login-btn" style="margin-bottom:14px">登录</button>
      <button class="btn ghost block" data-nav="#/register">还没有账号？立即注册</button>
    </div>
  `;
  document.getElementById('login-btn').addEventListener('click', async () => {
    const email = document.getElementById('l-email').value.trim();
    const password = document.getElementById('l-password').value;
    if (!email || !password) { toast('请输入邮箱与密码'); return; }
    const btn = document.getElementById('login-btn');
    btn.setAttribute('disabled', 'true');
    try {
      const { token, user } = await api('/auth/login', { method: 'POST', body: { email, password } });
      setAuth(token, user);
      toast('登录成功');
      const next = pendingNav; pendingNav = null;
      nav(next || '#/me');
    } catch (err) {
      toast(err.message || '登录失败');
    } finally {
      btn.removeAttribute('disabled');
    }
  });
}

function renderRegister() {
  app.innerHTML = `
    ${header('注册', { back: '#/me' })}
    <div class="page-body">
      <div class="hero" style="margin-bottom:20px">
        <div class="hero-eyebrow">灵一守玄坛</div>
        <div class="hero-title" style="font-size:16px">创建账号</div>
        <div class="hero-sub">诚心所愿 · 玄坛护佑</div>
      </div>
      <div class="form-card">
        <div class="field"><label>姓名</label><input id="r-name" placeholder="请输入姓名" /></div>
        <div class="field"><label>邮箱</label><input id="r-email" type="email" placeholder="请输入邮箱" /></div>
        <div class="field"><label>联系电话</label><input id="r-phone" placeholder="请输入联系电话" /></div>
        <div class="field"><label>密码</label><input id="r-password" type="password" placeholder="至少 6 位密码" /></div>
      </div>
      <button class="btn gold block" id="register-btn" style="margin-bottom:14px">注册</button>
      <button class="btn ghost block" data-nav="#/login">已有账号？立即登录</button>
    </div>
  `;
  document.getElementById('register-btn').addEventListener('click', async () => {
    const name = document.getElementById('r-name').value.trim();
    const email = document.getElementById('r-email').value.trim();
    const phone = document.getElementById('r-phone').value.trim();
    const password = document.getElementById('r-password').value;
    if (!name || !email || !password) { toast('请填写姓名、邮箱与密码'); return; }
    const btn = document.getElementById('register-btn');
    btn.setAttribute('disabled', 'true');
    try {
      const { token, user } = await api('/auth/register', { method: 'POST', body: { name, email, phone, password } });
      setAuth(token, user);
      toast('注册成功');
      const next = pendingNav; pendingNav = null;
      nav(next || '#/me');
    } catch (err) {
      toast(err.message || '注册失败');
    } finally {
      btn.removeAttribute('disabled');
    }
  });
}

/* ================= INIT ================= */

router();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
