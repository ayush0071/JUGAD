/* JUGAD — API client. Talks to the real Node/Express backend instead of browser storage. */

const TOKEN_KEY = 'jugad_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

async function apiRequest(path, { method = 'GET', body, isFormData = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!isFormData && body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    });
  } catch (networkErr) {
    // This is what a raw "Failed to fetch" becomes — it means the browser couldn't even
    // reach the server, usually because it's not running, or the page was opened some way
    // other than through http://localhost:5000 (e.g. double-clicking index.html, or Live Server).
    throw new Error("Can't reach the server. Make sure the Node server is running (npm run dev) and that you opened this page at http://localhost:5000 — not by double-clicking the file or via Live Server.");
  }

  let data = null;
  try { data = await res.json(); } catch { /* non-JSON response, e.g. file download handled separately */ }

  if (!res.ok) {
    const message = data?.message || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

const api = {
  get: (path) => apiRequest(path),
  post: (path, body, isFormData = false) => apiRequest(path, { method: 'POST', body, isFormData }),
  put: (path, body, isFormData = false) => apiRequest(path, { method: 'PUT', body, isFormData }),
  delete: (path) => apiRequest(path, { method: 'DELETE' }),

  // Downloads a protected file (needs the Authorization header, so a plain <a href> won't work)
  async downloadFile(path, fallbackFilename) {
    const token = getToken();
    const res = await fetch(`/api${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    });
    if (!res.ok) {
      let message = `Download failed (${res.status})`;
      try { const data = await res.json(); message = data.message || message; } catch {}
      throw new Error(message);
    }
    const disposition = res.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename = match ? match[1] : fallbackFilename;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
