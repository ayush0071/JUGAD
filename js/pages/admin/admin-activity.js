(async function () {
  const admin = await renderAdminSidebar('activity');
  if (!admin) return;

  const wrap = document.getElementById('activity-list');
  const { data: logs } = await api.get('/admin/activity');

  if (logs.length === 0) {
    wrap.innerHTML = emptyHTML('No activity recorded yet — actions you take in the admin panel will show up here.');
    return;
  }

  wrap.innerHTML = logs.map(l => `
    <div class="log-row">
      <div class="log-dot"></div>
      <div>
        <div><strong>${escapeHtml(l.adminName)}</strong> ${escapeHtml(l.action)}${l.detail ? ' — ' + escapeHtml(l.detail) : ''}</div>
        <div class="log-meta">${fmtDateTime(l.createdAt)}</div>
      </div>
    </div>
  `).join('');
})();
