/* 灵一守玄坛 — API client + auth/session state */

const AUTH_KEY = 'lyszt_auth_v1';

function loadAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : { token: null, user: null };
  } catch (e) {
    return { token: null, user: null };
  }
}

const STATE = {
  auth: loadAuth(),
  cart: null, // in-progress registration/prayer cart (client-side only until order submit)
};

function saveAuth() {
  localStorage.setItem(AUTH_KEY, JSON.stringify(STATE.auth));
}

function setAuth(token, user) {
  STATE.auth = { token, user };
  saveAuth();
}

function clearAuth() {
  STATE.auth = { token: null, user: null };
  saveAuth();
}

function isLoggedIn() { return !!STATE.auth.token; }

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

/* ---------- cart (shared between 法会报名 and 疏文办理 flows) ---------- */

function newCart(kind, ref) {
  STATE.cart = { kind, refId: ref.id, refTitle: ref.title || ref.name, items: [], members: [], main: null };
}

function cartTotal() {
  if (!STATE.cart) return 0;
  return STATE.cart.items.reduce((s, it) => s + it.price * it.qty, 0);
}

function findPrayerType(categories, id) {
  for (const c of categories) {
    const t = c.types.find((t) => t.id === id);
    if (t) return t;
  }
  return null;
}
