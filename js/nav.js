function injectBackground() {
  const bg = document.createElement('div');
  bg.className = 'bg-anim';
  const icons = ['💻', '🎓', '💼', '🎬', '📊', '🖌️'];
  const iconsHTML = icons.map((ic, i) => {
    const top = 8 + (i * 15) % 80;
    const left = (i % 2 === 0) ? 4 + i * 3 : 88 - i * 3;
    return `<span class="floating-icon" style="top:${top}%; left:${left}%; animation-delay:${i * 1.4}s; animation-duration:${9 + i}s;">${ic}</span>`;
  }).join('');
  bg.innerHTML = `
    <div class="blob blob1"></div><div class="blob blob2"></div><div class="blob blob3"></div><div class="blob blob4"></div>
    <div class="icon-field">${iconsHTML}</div>
  `;
  document.body.prepend(bg);
}

let _siteSettings = null;
async function getSettings() {
  if (_siteSettings) return _siteSettings;
  try {
    const { data } = await api.get('/settings');
    _siteSettings = data;
  } catch {
    _siteSettings = { siteName: 'JUGAD', maintenanceMode: false };
  }
  return _siteSettings;
}

async function renderNavbar(activePage = '') {
  const mount = document.getElementById('navbar');
  if (!mount) return;

  const user = await Auth.currentUser();
  const settings = await getSettings();

  const links = [
    { href: 'index.html', label: 'Home', key: 'home' },
    { href: 'explore.html', label: 'Explore', key: 'explore' },
    { href: 'explore.html?category=students', label: 'Students', key: '' },
    { href: 'explore.html?category=developers', label: 'Developers', key: '' },
    { href: 'explore.html?category=corporate', label: 'Corporate', key: '' },
  ];
  const linksHTML = links.map(l => `<a href="${l.href}" class="${l.key === activePage ? 'active' : ''}">${l.label}</a>`).join('');

  let actionsHTML = '';
  if (user) {
    const target = user.role === 'admin' ? 'admin/index.html' : 'dashboard.html';
    const label = user.role === 'admin' ? 'Admin panel' : 'Dashboard';
    const avatarHTML = user.avatar
      ? `<img src="${user.avatar}" alt="" style="width:30px; height:30px; border-radius:50%; object-fit:cover;" />`
      : `<span style="width:30px; height:30px; border-radius:50%; background:linear-gradient(135deg, var(--accent), var(--glow)); color:#fff; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700;">${escapeHtml((user.name?.[0] || '?').toUpperCase())}</span>`;
    actionsHTML = `
      <div class="notif-bell-wrap desktop-only">
        <button class="icon-btn" id="notif-bell-btn" title="Notifications">🔔</button>
        <span id="notif-badge" class="notif-badge" style="display:none;">0</span>
        <div id="notif-dropdown" class="notif-dropdown" style="display:none;"></div>
      </div>
      <a href="${target}" class="desktop-only" title="${label}">${avatarHTML}</a>
      <a href="${target}" class="btn btn-outline btn-sm desktop-only">${label}</a>
      <button class="link-btn desktop-only" id="nav-logout">Logout</button>
    `;
  } else {
    actionsHTML = `
      <a href="login.html" class="btn-sm desktop-only" style="color:var(--text-dim); font-weight:500; font-size:14px;">Log in</a>
      <a href="register.html" class="btn btn-primary btn-sm desktop-only">Get started</a>
    `;
  }

  mount.innerHTML = `
    ${settings.maintenanceMode ? `<div class="maintenance-banner">⚠ Maintenance mode is ON — turn it off in Admin → Settings before sharing this site.</div>` : ''}
    <nav class="navbar">
      <div class="container">
        <a href="index.html" class="brand">
          <img src="assets/logo-mark.png" alt="JUGAD" class="brand-mark-img" />
          <span>JUG<span class="brand-accent">AD</span></span>
        </a>
        <div class="nav-links">${linksHTML}</div>
        <div class="nav-actions">${actionsHTML}</div>
      </div>
    </nav>
  `;

  const logoutBtn = document.getElementById('nav-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await Auth.logout();
      toast('Logged out');
      window.location.href = 'index.html';
    });
  }

  if (user) {
    await refreshBell(user.id);
    document.getElementById('notif-bell-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      const dropdown = document.getElementById('notif-dropdown');
      const isOpen = dropdown.style.display === 'block';
      dropdown.style.display = isOpen ? 'none' : 'block';
      if (!isOpen) await markAllRead();
    });
    document.addEventListener('click', () => {
      const dropdown = document.getElementById('notif-dropdown');
      if (dropdown) dropdown.style.display = 'none';
    });

    // Real-time push from the server — works across different people's devices now.
    subscribeRealtime(() => refreshBell(user.id));
  }
}

async function refreshBell(currentUserId) {
  const badge = document.getElementById('notif-badge');
  const dropdown = document.getElementById('notif-dropdown');
  if (!badge || !dropdown) return;

  let all = [];
  try {
    const { data } = await api.get('/notifications');
    all = data;
  } catch { /* not logged in or request failed — leave bell empty */ }

  const lastRead = getLastReadTime();
  const unread = all.filter(n => new Date(n.createdAt).getTime() > lastRead).length;

  badge.style.display = unread > 0 ? 'flex' : 'none';
  badge.textContent = unread > 9 ? '9+' : String(unread);

  const recent = all.slice(0, 8);
  dropdown.innerHTML = recent.length
    ? recent.map(n => `
        <a href="${n.softwareSlug ? 'software.html?slug=' + encodeURIComponent(n.softwareSlug) : '#'}" class="notif-item">
          <div style="font-weight:600; font-size:13px;">${escapeHtml(n.title)}</div>
          <div class="text-dim" style="font-size:12px;">${escapeHtml(n.message)}</div>
          <div class="text-faint" style="font-size:11px; margin-top:2px;">${fmtDateTime(n.createdAt)}</div>
        </a>
      `).join('')
    : `<div class="text-faint" style="padding:16px; font-size:13px; text-align:center;">No notifications yet.</div>`;
}

async function markAllRead() {
  setLastReadTime(Date.now());
  const badge = document.getElementById('notif-badge');
  if (badge) badge.style.display = 'none';
}

function renderFooter() {
  const mount = document.getElementById('footer');
  if (!mount) return;
  mount.innerHTML = `
    <footer class="footer">
      <div class="container">
        <div class="footer-grid">
          <div>
            <div class="brand mb-2">
              <img src="assets/logo-mark.png" alt="JUGAD" class="brand-mark-img" /> JUG<span class="brand-accent">AD</span>
            </div>
            <p class="text-dim" style="font-size:13px; max-width:280px;">A marketplace of tools built by independent developers — for students, workers, editors, developers and corporate teams.</p>
          </div>
          <div>
            <h4>Explore</h4>
            <a href="explore.html?category=students">For Students</a>
            <a href="explore.html?category=workers">For Workers</a>
            <a href="explore.html?category=editors">For Editors</a>
            <a href="explore.html?category=developers">For Developers</a>
          </div>
          <div>
            <h4>Account</h4>
            <a href="login.html">Log in</a>
            <a href="register.html">Sign up</a>
            <a href="dashboard.html">My dashboard</a>
          </div>
          <div>
            <h4>Company</h4>
            <a href="admin/login.html">Admin login</a>
            <a href="#faq">FAQ</a>
          </div>
        </div>
        <div class="footer-bottom">
          <p>© ${new Date().getFullYear()} JUGAD — software for people who build, learn and ship.</p>
          <p>Made with a lot of ☕ and a little jugaad.</p>
        </div>
      </div>
    </footer>
  `;
}

async function initPage(activeNav = '') {
  injectBackground();
  await renderNavbar(activeNav);
  renderFooter();
}
