(async function () {
  const admin = await renderAdminSidebar('dashboard');
  if (!admin) return;

  const { data: stats } = await api.get('/admin/stats');

  const cards = [
    { label: 'Total software', value: stats.totalSoftware, icon: '📦' },
    { label: 'Published', value: stats.published, icon: '✅' },
    { label: 'Total users', value: stats.totalUsers, icon: '👥' },
    { label: 'Total downloads', value: stats.totalDownloads, icon: '⬇' },
  ];

  document.getElementById('stat-grid').innerHTML = cards.map(s => `
    <div class="card stat-card fade-up">
      <div style="font-size:20px; margin-bottom:8px;">${s.icon}</div>
      <div class="num">${s.value}</div>
      <div class="label">${s.label}</div>
    </div>
  `).join('');

  const revenueHTML = `
    <div class="card-flat mb-4">
      <h2 class="mb-2" style="font-size:18px;">Revenue (confirmed payments)</h2>
      <p class="font-display" style="font-size:30px; font-weight:700; color: var(--glow);">₹${stats.revenue.toFixed(2)}</p>
      <p class="text-dim mt-1" style="font-size:13px;">${stats.paidOrderCount} confirmed orders</p>
    </div>
  `;

  const maxVal = Math.max(...stats.byCategory.map(c => c.downloads), 1);
  const chartHTML = stats.byCategory.length ? `
    <div class="card-flat mb-4">
      <h2 class="mb-3" style="font-size:18px;">Downloads by category</h2>
      <div class="bar-chart">
        ${stats.byCategory.map(c => `
          <div class="bar-row">
            <span class="bar-label">${escapeHtml(c._id)}</span>
            <div class="bar-track"><div class="bar-fill" style="width:${(c.downloads / maxVal * 100).toFixed(0)}%"></div></div>
            <span class="bar-value">${c.downloads}</span>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  document.getElementById('recent-wrap').innerHTML = `${revenueHTML}${chartHTML}`;
})();
