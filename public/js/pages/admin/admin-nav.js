async function renderAdminSidebar(activeKey) {
  const admin = await requireAdmin('login.html');
  if (!admin) return null;

  const mount = document.getElementById('admin-sidebar');
  const links = [
    { href: 'index.html', label: '📊 Dashboard', key: 'dashboard' },
    { href: 'software.html', label: '📦 Software', key: 'software' },
    { href: 'orders.html', label: '🛒 Orders', key: 'orders' },
    { href: 'coupons.html', label: '🏷️ Coupons', key: 'coupons' },
    { href: 'reviews.html', label: '⭐ Reviews', key: 'reviews' },
    { href: 'developers.html', label: '🧑‍💻 Developers', key: 'developers' },
    { href: 'users.html', label: '👥 Users', key: 'users' },
    { href: 'activity.html', label: '🕒 Activity Log', key: 'activity' },
    { href: 'settings.html', label: '⚙️ Settings', key: 'settings' },
  ];

  mount.innerHTML = `
    <aside class="admin-sidebar">
      <a href="../index.html" class="brand">
        <img src="../assets/logo-mark.png" alt="JUGAD" class="brand-mark-img" /> JUGAD
      </a>
      <span class="admin-badge">🔒 Admin only</span>
      <nav class="admin-nav">
        ${links.map(l => `<a href="${l.href}" class="${l.key === activeKey ? 'active' : ''}">${l.label}</a>`).join('')}
      </nav>
      <div class="admin-footer">
        <p class="who">${escapeHtml(admin.name)}</p>
        <p class="email">${escapeHtml(admin.email)}</p>
        <a href="../index.html" style="font-size:13px; color:var(--text-dim); display:block; margin-bottom:8px;">↗ View site</a>
        <button class="link-btn" id="admin-logout" style="color:var(--danger); font-size:13px;">Logout</button>
      </div>
    </aside>
  `;

  document.getElementById('admin-logout').addEventListener('click', async () => {
    await Auth.logout();
    window.location.href = 'login.html';
  });

  return admin;
}
