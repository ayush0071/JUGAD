/* JUGAD — notifications.
   Now genuinely real-time across different people's devices, via a live SSE
   connection to the server (not just tabs of the same browser like the old
   backend-less version). The server also sends real email via SMTP. */

let _eventSource = null;

function subscribeRealtime(onNotification) {
  if (_eventSource) return;
  const token = localStorage.getItem('jugad_token');
  // EventSource can't set custom headers, but our backend also accepts the httpOnly
  // cookie set at login, so this works as long as frontend + API share an origin.
  _eventSource = new EventSource('/api/notifications/stream');
  _eventSource.onmessage = (e) => {
    try { onNotification(JSON.parse(e.data)); } catch {}
  };
  _eventSource.onerror = () => {
    // Browser auto-reconnects EventSource; nothing to do here.
  };
}

function getLastReadTime() {
  return Number(localStorage.getItem('jugad_notif_last_read') || 0);
}
function setLastReadTime(ts) {
  localStorage.setItem('jugad_notif_last_read', String(ts));
}
