/* 灵一守玄坛 — 后台管理 (admin backoffice) */

const ADMIN_AUTH_KEY = 'lyszt_admin_auth_v1';
const root = document.getElementById('admin-app');

function loadAuth() {
  try {
    const raw = localStorage.getItem(ADMIN_AUTH_KEY);
    return raw ? JSON.parse(raw) : { token: null, user: null };
  } catch (e) {
    return { token: null, user: null };
  }
}

const STATE = { auth: loadAuth(), tab: 'dashboard', cache: {} };

function saveAuth() { localStorage.setItem(ADMIN_AUTH_KEY, JSON.stringify(STATE.auth)); }
function setAuth(token, user) { STATE.auth = { token, user }; saveAuth(); }
function clearAuth() { STATE.auth = { token: null, user: null }; saveAuth(); }
function isLoggedIn() { return !!STATE.auth.token && STATE.auth.user && STATE.auth.user.role === 'admin'; }

class ApiError extends Error {}

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (STATE.auth.token) headers.Authorization = `Bearer ${STATE.auth.token}`;
  const res = await fetch(`/api${path}`, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch (e) { /* no body */ }
  if (!res.ok) {
    if (res.status === 401) clearAuth();
    throw new ApiError((data && data.error) || `请求失败 (${res.status})`);
  }
  return data;
}

function toast(msg, isErr) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show' + (isErr ? ' err' : '');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.className = 'toast'; }, 2200);
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function fmt(n) { return `RM ${Number(n).toFixed(2)}`; }

/* ================= RENDER SHELL ================= */

function render() {
  if (!isLoggedIn()) return renderLogin();
  renderShell();
}

function renderLogin() {
  root.innerHTML = `
    <div class="login-screen">
      <div class="login-box">
        <div class="lb-title">灵一守玄坛 · 后台管理</div>
        <div class="lb-sub">管理员登录</div>
        <div class="err" id="login-err"></div>
        <div class="field"><label>邮箱</label><input id="l-email" type="email" placeholder="admin@lyszt.local" /></div>
        <div class="field"><label>密码</label><input id="l-password" type="password" placeholder="密码" /></div>
        <button class="btn gold" id="login-btn" style="width:100%">登录</button>
      </div>
    </div>
  `;
  const doLogin = async () => {
    const email = document.getElementById('l-email').value.trim();
    const password = document.getElementById('l-password').value;
    const errEl = document.getElementById('login-err');
    errEl.textContent = '';
    if (!email || !password) { errEl.textContent = '请输入邮箱与密码'; return; }
    try {
      const { token, user } = await api('/auth/login', { method: 'POST', body: { email, password } });
      if (user.role !== 'admin') { errEl.textContent = '此账号无管理员权限'; return; }
      setAuth(token, user);
      STATE.tab = 'dashboard';
      render();
    } catch (err) {
      errEl.textContent = err.message || '登录失败';
    }
  };
  document.getElementById('login-btn').addEventListener('click', doLogin);
  root.querySelectorAll('input').forEach((inp) => inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); }));
}

const TABS = [
  ['dashboard', '概览'],
  ['events', '法会'],
  ['prayers', '疏文'],
  ['announcements', '公告'],
  ['orders', '订单'],
  ['members', '会员'],
];

function renderShell() {
  root.innerHTML = `
    <div class="shell">
      <div class="sidebar">
        <div class="brand">灵一守玄坛<small>后台管理</small></div>
        ${TABS.map(([k, l]) => `<div class="nav-item ${STATE.tab === k ? 'active' : ''}" data-tab="${k}">${l}</div>`).join('')}
        <div class="sidebar-foot">
          <div class="sf-name">${esc(STATE.auth.user.name)}</div>
          <div class="sf-email">${esc(STATE.auth.user.email)}</div>
          <div class="sf-logout" id="logout-btn">退出登录</div>
        </div>
      </div>
      <div class="main" id="main"></div>
    </div>
  `;
  root.querySelectorAll('.nav-item').forEach((n) => n.addEventListener('click', () => { STATE.tab = n.dataset.tab; render(); }));
  document.getElementById('logout-btn').addEventListener('click', () => { clearAuth(); render(); });

  const main = document.getElementById('main');
  const loaders = {
    dashboard: renderDashboard,
    events: renderEvents,
    prayers: renderPrayers,
    announcements: renderAnnouncements,
    orders: renderOrders,
    members: renderMembers,
  };
  main.innerHTML = `<div class="empty-note">加载中…</div>`;
  loaders[STATE.tab](main).catch((e) => {
    main.innerHTML = `<div class="empty-note">${esc(e.message || '加载失败')}</div>`;
  });
}

function mainHeader(title, sub) {
  return `<div class="main-header"><div><h1>${title}</h1>${sub ? `<div class="mh-sub">${sub}</div>` : ''}</div></div>`;
}

/* ================= DASHBOARD ================= */

async function renderDashboard(main) {
  const stats = await api('/admin/stats');
  main.innerHTML = `
    ${mainHeader('概览', '灵一守玄坛 · 数据总览')}
    <div class="stat-grid">
      <div class="stat-card"><div class="sc-label">会员数</div><div class="sc-value">${stats.members}</div></div>
      <div class="stat-card"><div class="sc-label">法会数</div><div class="sc-value">${stats.events}</div></div>
      <div class="stat-card"><div class="sc-label">疏文种类</div><div class="sc-value">${stats.prayerTypes}</div></div>
      <div class="stat-card"><div class="sc-label">已付款订单 / 总收入</div><div class="sc-value">${stats.orders} · ${fmt(stats.revenue)}</div></div>
    </div>
    <div class="panel">
      <div class="panel-title">最近订单</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>订单号</th><th>会员</th><th>项目</th><th>金额</th><th>时间</th></tr></thead>
          <tbody>
            ${stats.recentOrders.length ? stats.recentOrders.map((o) => `
              <tr><td>${esc(o.order_no)}</td><td>${esc(o.member_name)}</td><td>${esc(o.ref_title)}</td><td class="num">${fmt(o.total)}</td><td>${esc(o.created_at)}</td></tr>
            `).join('') : `<tr><td colspan="5" class="empty-note">暂无订单</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/* ================= EVENTS ================= */

async function renderEvents(main) {
  const { events } = await api('/admin/events');
  main.innerHTML = `
    ${mainHeader('法会管理', '法会活动与报名项目')}
    <div class="panel">
      <div class="panel-title">新增法会</div>
      <div id="event-create-form"></div>
    </div>
    <div id="event-list"></div>
  `;
  document.getElementById('event-create-form').innerHTML = eventFormHtml('new', {});
  bindEventForm('new', null);

  const listEl = document.getElementById('event-list');
  if (!events.length) { listEl.innerHTML = `<div class="empty-note">暂无法会</div>`; return; }
  listEl.innerHTML = events.map((e) => eventCardHtml(e)).join('');
  events.forEach((e) => bindEventCard(e));
}

function eventFormHtml(id, e) {
  return `
    <div class="form-grid">
      <div class="field"><label>标题</label><input id="ef-title-${id}" value="${esc(e.title || '')}" placeholder="2027 新春新福法会" /></div>
      <div class="field"><label>状态</label>
        <select id="ef-status-${id}">
          <option value="upcoming" ${e.status === 'upcoming' ? 'selected' : ''}>即将开始</option>
          <option value="ongoing" ${e.status === 'ongoing' ? 'selected' : ''}>进行中</option>
          <option value="ended" ${e.status === 'ended' ? 'selected' : ''}>已结束</option>
        </select>
      </div>
      <div class="field"><label>日期显示文字</label><input id="ef-dateLabel-${id}" value="${esc(e.date_label || '')}" placeholder="2027年2月10日 (正月初五)" /></div>
      <div class="field"><label>日期 (YYYY-MM-DD)</label><input id="ef-eventDate-${id}" type="date" value="${esc(e.event_date || '')}" /></div>
      <div class="field"><label>地点</label><input id="ef-place-${id}" value="${esc(e.place || '灵一守玄坛')}" /></div>
      <div class="field"><label>标签</label><input id="ef-tag-${id}" value="${esc(e.tag || '')}" placeholder="新春祈福 · 万事如意" /></div>
      <div class="field full"><label>描述</label><textarea id="ef-description-${id}">${esc(e.description || '')}</textarea></div>
    </div>
    <div class="btn-row">
      <button class="btn gold sm" id="ef-save-${id}">${id === 'new' ? '创建法会' : '保存'}</button>
    </div>
  `;
}

function readEventForm(id) {
  return {
    title: document.getElementById(`ef-title-${id}`).value.trim(),
    status: document.getElementById(`ef-status-${id}`).value,
    dateLabel: document.getElementById(`ef-dateLabel-${id}`).value.trim(),
    eventDate: document.getElementById(`ef-eventDate-${id}`).value,
    place: document.getElementById(`ef-place-${id}`).value.trim(),
    tag: document.getElementById(`ef-tag-${id}`).value.trim(),
    description: document.getElementById(`ef-description-${id}`).value.trim(),
  };
}

function bindEventForm(id, existingId) {
  document.getElementById(`ef-save-${id}`).addEventListener('click', async () => {
    const body = readEventForm(id);
    if (!body.title || !body.dateLabel || !body.eventDate) { toast('请填写标题与日期', true); return; }
    try {
      if (existingId) {
        await api(`/admin/events/${existingId}`, { method: 'PUT', body });
        toast('已保存');
      } else {
        await api('/admin/events', { method: 'POST', body });
        toast('已创建法会');
      }
      renderShell();
    } catch (e) { toast(e.message, true); }
  });
}

function eventCardHtml(e) {
  return `
  <div class="entity-card" id="event-card-${e.id}">
    <div class="ec-head">
      <div>
        <div class="ec-title">${esc(e.title)} <span class="badge tag">${{ ongoing: '进行中', upcoming: '即将开始', ended: '已结束' }[e.status] || e.status}</span></div>
        <div class="ec-meta">${esc(e.date_label)} · ${esc(e.place)}</div>
      </div>
      <div class="btn-row">
        <button class="btn ghost sm" data-edit-event="${e.id}">编辑</button>
        <button class="btn danger sm" data-del-event="${e.id}">删除</button>
      </div>
    </div>
    <div id="event-edit-${e.id}"></div>
    <div class="subpanel">
      <div class="subpanel-title">报名项目</div>
      ${e.items.map((it) => `
        <div class="item-line">
          <span>${esc(it.name)} — ${fmt(it.price)}</span>
          <span class="il-actions">
            <span class="il-link" data-edit-item="${e.id}:${it.id}">编辑</span>
            <span class="il-link danger" data-del-item="${e.id}:${it.id}">删除</span>
          </span>
        </div>
        <div id="item-edit-${e.id}-${it.id}"></div>
      `).join('') || '<div class="empty-note">暂无项目</div>'}
      <div class="btn-row" style="margin-top:10px">
        <button class="btn ghost sm" data-add-item="${e.id}">+ 新增项目</button>
      </div>
      <div id="item-new-${e.id}"></div>
    </div>
  </div>`;
}

function itemFormHtml(key, it) {
  return `
    <div class="form-grid">
      <div class="field"><label>名称</label><input id="if-name-${key}" value="${esc(it.name || '')}" /></div>
      <div class="field"><label>价格 (RM)</label><input id="if-price-${key}" type="number" step="0.01" value="${it.price ?? ''}" /></div>
    </div>
    <div class="btn-row"><button class="btn gold sm" id="if-save-${key}">保存</button></div>
  `;
}

function bindEventCard(e) {
  document.querySelector(`[data-edit-event="${e.id}"]`).addEventListener('click', () => {
    const box = document.getElementById(`event-edit-${e.id}`);
    box.innerHTML = box.innerHTML ? '' : eventFormHtml(e.id, e);
    if (box.innerHTML) bindEventForm(e.id, e.id);
  });
  document.querySelector(`[data-del-event="${e.id}"]`).addEventListener('click', async () => {
    if (!confirm(`确定删除法会「${e.title}」？此操作不可恢复。`)) return;
    try { await api(`/admin/events/${e.id}`, { method: 'DELETE' }); toast('已删除'); renderShell(); }
    catch (err) { toast(err.message, true); }
  });
  document.querySelector(`[data-add-item="${e.id}"]`).addEventListener('click', () => {
    const box = document.getElementById(`item-new-${e.id}`);
    const key = `${e.id}-new`;
    box.innerHTML = box.innerHTML ? '' : itemFormHtml(key, {});
    if (!box.innerHTML) return;
    document.getElementById(`if-save-${key}`).addEventListener('click', async () => {
      const name = document.getElementById(`if-name-${key}`).value.trim();
      const price = Number(document.getElementById(`if-price-${key}`).value);
      if (!name || !(price >= 0)) { toast('请填写项目名称与价格', true); return; }
      try { await api(`/admin/events/${e.id}/items`, { method: 'POST', body: { name, price } }); toast('已新增'); renderShell(); }
      catch (err) { toast(err.message, true); }
    });
  });
  e.items.forEach((it) => {
    const editKey = `${e.id}:${it.id}`;
    document.querySelector(`[data-edit-item="${editKey}"]`).addEventListener('click', () => {
      const box = document.getElementById(`item-edit-${e.id}-${it.id}`);
      const formKey = `${e.id}-${it.id}`;
      box.innerHTML = box.innerHTML ? '' : itemFormHtml(formKey, it);
      if (!box.innerHTML) return;
      document.getElementById(`if-save-${formKey}`).addEventListener('click', async () => {
        const name = document.getElementById(`if-name-${formKey}`).value.trim();
        const price = Number(document.getElementById(`if-price-${formKey}`).value);
        try { await api(`/admin/events/${e.id}/items/${it.id}`, { method: 'PUT', body: { name, price } }); toast('已保存'); renderShell(); }
        catch (err) { toast(err.message, true); }
      });
    });
    document.querySelector(`[data-del-item="${editKey}"]`).addEventListener('click', async () => {
      if (!confirm('确定删除此项目？')) return;
      try { await api(`/admin/events/${e.id}/items/${it.id}`, { method: 'DELETE' }); toast('已删除'); renderShell(); }
      catch (err) { toast(err.message, true); }
    });
  });
}

/* ================= PRAYERS ================= */

async function renderPrayers(main) {
  const { categories } = await api('/admin/prayers/categories');
  main.innerHTML = `
    ${mainHeader('疏文管理', '疏文分类与项目')}
    <div class="panel">
      <div class="panel-title">新增分类</div>
      <div class="form-grid">
        <div class="field"><label>分类名称</label><input id="cf-name-new" placeholder="财福事业" /></div>
        <div class="field"><label>图标</label>
          <select id="cf-icon-new">
            ${['coin', 'shield', 'star', 'sprout', 'lotus', 'more'].map((i) => `<option value="${i}">${i}</option>`).join('')}
          </select>
        </div>
        <div class="field full"><label>说明</label><input id="cf-desc-new" placeholder="补财库、旺事业、招财纳福" /></div>
      </div>
      <div class="btn-row"><button class="btn gold sm" id="cf-save-new">创建分类</button></div>
    </div>
    <div id="cat-list"></div>
  `;
  document.getElementById('cf-save-new').addEventListener('click', async () => {
    const name = document.getElementById('cf-name-new').value.trim();
    const icon = document.getElementById('cf-icon-new').value;
    const description = document.getElementById('cf-desc-new').value.trim();
    if (!name) { toast('请填写分类名称', true); return; }
    try { await api('/admin/prayers/categories', { method: 'POST', body: { name, icon, description } }); toast('已创建'); renderShell(); }
    catch (e) { toast(e.message, true); }
  });

  const listEl = document.getElementById('cat-list');
  if (!categories.length) { listEl.innerHTML = `<div class="empty-note">暂无分类</div>`; return; }
  listEl.innerHTML = categories.map((c) => catCardHtml(c)).join('');
  categories.forEach((c) => bindCatCard(c));
}

function catCardHtml(c) {
  return `
  <div class="entity-card">
    <div class="ec-head">
      <div><div class="ec-title">${esc(c.name)}</div><div class="ec-meta">${esc(c.description)}</div></div>
      <div class="btn-row">
        <button class="btn danger sm" data-del-cat="${c.id}">删除分类</button>
      </div>
    </div>
    <div class="subpanel">
      <div class="subpanel-title">疏文项目</div>
      ${c.types.map((t) => `
        <div class="item-line">
          <span>${esc(t.name)} — ${fmt(t.price)}<br><span style="color:var(--text-faint);font-size:11px">${esc(t.description)}</span></span>
          <span class="il-actions">
            <span class="il-link" data-edit-type="${c.id}:${t.id}">编辑</span>
            <span class="il-link danger" data-del-type="${c.id}:${t.id}">删除</span>
          </span>
        </div>
        <div id="type-edit-${t.id}"></div>
      `).join('') || '<div class="empty-note">暂无项目</div>'}
      <div class="btn-row" style="margin-top:10px"><button class="btn ghost sm" data-add-type="${c.id}">+ 新增疏文</button></div>
      <div id="type-new-${c.id}"></div>
    </div>
  </div>`;
}

function typeFormHtml(key, t) {
  return `
    <div class="form-grid">
      <div class="field"><label>名称</label><input id="tf-name-${key}" value="${esc(t.name || '')}" /></div>
      <div class="field"><label>价格 (RM)</label><input id="tf-price-${key}" type="number" step="0.01" value="${t.price ?? ''}" /></div>
      <div class="field full"><label>说明</label><input id="tf-desc-${key}" value="${esc(t.description || '')}" /></div>
    </div>
    <div class="btn-row"><button class="btn gold sm" id="tf-save-${key}">保存</button></div>
  `;
}

function bindCatCard(c) {
  document.querySelector(`[data-del-cat="${c.id}"]`).addEventListener('click', async () => {
    if (!confirm(`确定删除分类「${c.name}」及其所有疏文？`)) return;
    try { await api(`/admin/prayers/categories/${c.id}`, { method: 'DELETE' }); toast('已删除'); renderShell(); }
    catch (e) { toast(e.message, true); }
  });
  document.querySelector(`[data-add-type="${c.id}"]`).addEventListener('click', () => {
    const box = document.getElementById(`type-new-${c.id}`);
    const key = `${c.id}-new`;
    box.innerHTML = box.innerHTML ? '' : typeFormHtml(key, {});
    if (!box.innerHTML) return;
    document.getElementById(`tf-save-${key}`).addEventListener('click', async () => {
      const name = document.getElementById(`tf-name-${key}`).value.trim();
      const price = Number(document.getElementById(`tf-price-${key}`).value);
      const description = document.getElementById(`tf-desc-${key}`).value.trim();
      if (!name || !(price >= 0)) { toast('请填写名称与价格', true); return; }
      try { await api(`/admin/prayers/categories/${c.id}/types`, { method: 'POST', body: { name, price, description } }); toast('已新增'); renderShell(); }
      catch (e) { toast(e.message, true); }
    });
  });
  c.types.forEach((t) => {
    const editKey = `${c.id}:${t.id}`;
    document.querySelector(`[data-edit-type="${editKey}"]`).addEventListener('click', () => {
      const box = document.getElementById(`type-edit-${t.id}`);
      box.innerHTML = box.innerHTML ? '' : typeFormHtml(t.id, t);
      if (!box.innerHTML) return;
      document.getElementById(`tf-save-${t.id}`).addEventListener('click', async () => {
        const name = document.getElementById(`tf-name-${t.id}`).value.trim();
        const price = Number(document.getElementById(`tf-price-${t.id}`).value);
        const description = document.getElementById(`tf-desc-${t.id}`).value.trim();
        try { await api(`/admin/prayers/types/${t.id}`, { method: 'PUT', body: { name, price, description } }); toast('已保存'); renderShell(); }
        catch (e) { toast(e.message, true); }
      });
    });
    document.querySelector(`[data-del-type="${editKey}"]`).addEventListener('click', async () => {
      if (!confirm('确定删除此疏文？')) return;
      try { await api(`/admin/prayers/types/${t.id}`, { method: 'DELETE' }); toast('已删除'); renderShell(); }
      catch (e) { toast(e.message, true); }
    });
  });
}

/* ================= ANNOUNCEMENTS ================= */

async function renderAnnouncements(main) {
  const { announcements } = await api('/admin/announcements');
  main.innerHTML = `
    ${mainHeader('公告 / 优惠推广', '首页公告横幅与会员通知来源')}
    <div class="panel">
      <div class="panel-title">新增公告</div>
      ${announcementFormHtml('new', {})}
    </div>
    <div id="ann-list"></div>
  `;
  bindAnnouncementForm('new', null);

  const listEl = document.getElementById('ann-list');
  if (!announcements.length) { listEl.innerHTML = `<div class="empty-note">暂无公告</div>`; return; }
  listEl.innerHTML = announcements.map((a) => `
    <div class="entity-card">
      <div class="ec-head">
        <div>
          <div class="ec-title">${esc(a.title)} <span class="badge ${a.active ? 'on' : 'off'}">${a.active ? '启用中' : '已停用'}</span></div>
          <div class="ec-meta">${esc(a.badge)} · ${esc(a.body)}</div>
        </div>
        <div class="btn-row">
          <button class="btn ghost sm" data-edit-ann="${a.id}">编辑</button>
          <button class="btn ${a.active ? 'ghost' : 'gold'} sm" data-toggle-ann="${a.id}">${a.active ? '停用' : '启用'}</button>
          <button class="btn danger sm" data-del-ann="${a.id}">删除</button>
        </div>
      </div>
      <div id="ann-edit-${a.id}"></div>
    </div>
  `).join('');

  announcements.forEach((a) => {
    document.querySelector(`[data-edit-ann="${a.id}"]`).addEventListener('click', () => {
      const box = document.getElementById(`ann-edit-${a.id}`);
      box.innerHTML = box.innerHTML ? '' : announcementFormHtml(a.id, a);
      if (box.innerHTML) bindAnnouncementForm(a.id, a.id);
    });
    document.querySelector(`[data-toggle-ann="${a.id}"]`).addEventListener('click', async () => {
      try { await api(`/admin/announcements/${a.id}`, { method: 'PUT', body: { active: !a.active } }); renderShell(); }
      catch (e) { toast(e.message, true); }
    });
    document.querySelector(`[data-del-ann="${a.id}"]`).addEventListener('click', async () => {
      if (!confirm('确定删除此公告？')) return;
      try { await api(`/admin/announcements/${a.id}`, { method: 'DELETE' }); toast('已删除'); renderShell(); }
      catch (e) { toast(e.message, true); }
    });
  });
}

function announcementFormHtml(id, a) {
  return `
    <div class="form-grid">
      <div class="field"><label>标签</label><input id="af-badge-${id}" value="${esc(a.badge || '公告')}" placeholder="公告 / 优惠" /></div>
      <div class="field"><label>标题</label><input id="af-title-${id}" value="${esc(a.title || '')}" /></div>
      <div class="field full"><label>内容</label><textarea id="af-body-${id}">${esc(a.body || '')}</textarea></div>
      <div class="field"><label>关联法会 ID (可选)</label><input id="af-link-${id}" value="${esc(a.link_id || '')}" placeholder="ev1" /></div>
    </div>
    <div class="btn-row"><button class="btn gold sm" id="af-save-${id}">${id === 'new' ? '创建公告' : '保存'}</button></div>
  `;
}

function bindAnnouncementForm(id, existingId) {
  document.getElementById(`af-save-${id}`).addEventListener('click', async () => {
    const badge = document.getElementById(`af-badge-${id}`).value.trim() || '公告';
    const title = document.getElementById(`af-title-${id}`).value.trim();
    const body = document.getElementById(`af-body-${id}`).value.trim();
    const linkId = document.getElementById(`af-link-${id}`).value.trim();
    if (!title || !body) { toast('请填写标题与内容', true); return; }
    const payload = { badge, title, body, linkKind: linkId ? 'event' : null, linkId: linkId || null };
    try {
      if (existingId) await api(`/admin/announcements/${existingId}`, { method: 'PUT', body: payload });
      else await api('/admin/announcements', { method: 'POST', body: payload });
      toast('已保存');
      renderShell();
    } catch (e) { toast(e.message, true); }
  });
}

/* ================= ORDERS (read-only) ================= */

async function renderOrders(main) {
  const { orders } = await api('/admin/orders');
  main.innerHTML = `
    ${mainHeader('订单管理', `共 ${orders.length} 笔订单`)}
    <div class="panel">
      <div class="table-wrap">
        <table>
          <thead><tr><th>订单号</th><th>会员</th><th>项目</th><th>金额</th><th>付款方式</th><th>状态</th><th>时间</th></tr></thead>
          <tbody>
            ${orders.length ? orders.map((o) => `
              <tr>
                <td>${esc(o.order_no)}</td>
                <td>${esc(o.member_name)}<br><span style="color:var(--text-faint);font-size:11px">${esc(o.member_email)}</span></td>
                <td>${esc(o.ref_title)}</td>
                <td class="num">${fmt(o.total)}</td>
                <td>${{ fpx: 'FPX', grabpay: 'GrabPay', tng: "TnG" }[o.pay_method] || esc(o.pay_method)}</td>
                <td><span class="badge ${o.status}">${o.status === 'paid' ? '已付款' : '待付款'}</span></td>
                <td>${esc(o.created_at)}</td>
              </tr>
            `).join('') : `<tr><td colspan="7" class="empty-note">暂无订单</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/* ================= MEMBERS (read-only) ================= */

async function renderMembers(main) {
  const { members } = await api('/admin/members');
  main.innerHTML = `
    ${mainHeader('会员管理', `共 ${members.length} 位会员`)}
    <div class="panel">
      <div class="table-wrap">
        <table>
          <thead><tr><th>姓名</th><th>邮箱</th><th>电话</th><th>订单数</th><th>累计消费</th><th>注册时间</th></tr></thead>
          <tbody>
            ${members.length ? members.map((m) => `
              <tr>
                <td>${esc(m.name)}</td><td>${esc(m.email)}</td><td>${esc(m.phone || '-')}</td>
                <td>${m.order_count}</td><td class="num">${fmt(m.total_spent)}</td><td>${esc(m.created_at)}</td>
              </tr>
            `).join('') : `<tr><td colspan="6" class="empty-note">暂无会员</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/* ================= INIT ================= */

render();
