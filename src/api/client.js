// Thin fetch wrapper that attaches the JWT and normalizes errors.
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getToken() {
  return localStorage.getItem('acadhr_crm_token');
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    /* empty body is fine */
  }

  if (!res.ok) {
    const err = new Error((data && data.message) || 'Request failed');
    // Global error popup for any failed request (the success popup is below).
    try {
      window.dispatchEvent(new CustomEvent('app:toast', {
        detail: {
          message: res.status === 401 && !path.startsWith('/auth')
            ? 'Session expired — please sign in again'
            : (data && data.message) || 'Something went wrong. Please try again.',
          type: 'error',
        },
      }));
    } catch (_) {
      /* non-browser env — ignore */
    }
    err.status = res.status;
    throw err;
  }

  // Read-only POST calls (fetching from AcadHr, duplicate checks) don't save
  // anything, so they must not show a "Saved" popup.
  if (method === 'POST' && /\/(fetch|check-duplicates|existing|preview)$/.test(path.split('?')[0])) {
    return data;
  }

  // The auto-sync on/off switch shows its own clearer popup ("Auto-sync turned ON/OFF").
  if (method === 'PATCH' && path === '/acadhr-sync/auto') {
    return data;
  }

  // Choosing a plan shows its own detailed popup ("Plan set: Premium · 3 months · ₹5,400").
  if (method === 'PATCH' && path === '/plans/select') {
    return data;
  }

  // Global "Saved" popup for any successful mutation (skip reads and login).
  if (method !== 'GET' && !path.startsWith('/auth')) {
    try {
      window.dispatchEvent(new CustomEvent('app:toast', {
        detail: { message: method === 'DELETE' ? 'Deleted' : 'Saved', type: 'success' },
      }));
    } catch (_) {
      /* non-browser env — ignore */
    }
  }

  return data;
}

export const api = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method: 'POST', body }),
  put: (p, body) => request(p, { method: 'PUT', body }),
  patch: (p, body) => request(p, { method: 'PATCH', body }),
  del: (p) => request(p, { method: 'DELETE' }),
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: { email, password }, auth: false }),
};
