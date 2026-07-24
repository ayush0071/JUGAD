function toast(message, type = 'success') {
  let wrap = document.getElementById('toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'toast-wrap';
    document.body.appendChild(wrap);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function fmtPrice(item) {
  if (item.isFree || item.price === 0) return 'Free';
  if (item.discountPrice > 0) return `₹${item.discountPrice}`;
  return `₹${item.price}`;
}

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtDateTime(ts) {
  return new Date(ts).toLocaleString();
}

function fmtBytes(bytes) {
  if (!bytes) return '0 KB';
  const kb = bytes / 1024;
  if (kb < 1024) return kb.toFixed(1) + ' KB';
  return (kb / 1024).toFixed(1) + ' MB';
}

function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function requireAuth(redirectTo = 'login.html') {
  const token = localStorage.getItem('jugad_token');
  if (!token) {
    window.location.href = redirectTo;
    return false;
  }
  return true;
}

async function requireAdmin(redirectTo = 'login.html') {
  const user = await Auth.currentUser();
  if (!user || user.role !== 'admin') {
    if (user) toast('Admins only — you do not have access to this area.', 'error');
    window.location.href = redirectTo;
    return null;
  }
  return user;
}

function loaderHTML(label = 'Loading') {
  return `<div class="loader-wrap"><div class="spinner"></div><span>${escapeHtml(label)}...</span></div>`;
}

function emptyHTML(text) {
  return `<div class="empty">${escapeHtml(text)}</div>`;
}

function starString(rating) {
  const full = Math.round(rating || 0);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

function renderSoftwareCard(item, opts = {}) {
  const inAdmin = location.pathname.includes('/admin/');
  const href = `${inAdmin ? '../' : ''}software.html?slug=${encodeURIComponent(item.slug)}`;
  const cover = item.coverImage
    ? `<img src="${item.coverImage}" alt="${escapeHtml(item.title)}" />`
    : escapeHtml(item.title[0] || '?');

  const wishBtn = opts.showWishlist
    ? `<button class="icon-btn ${opts.isWishlisted ? 'active' : ''}" data-wishlist="${item._id}" title="Toggle wishlist" onclick="event.preventDefault(); event.stopPropagation();">${opts.isWishlisted ? '❤' : '♡'}</button>`
    : '';

  return `
    <a href="${href}" class="card fade-up">
      <div class="sw-card-top">
        <div class="sw-cover" style="flex:1;">${cover}</div>
      </div>
      <div class="flex flex-between" style="align-items:flex-start;">
        <span class="badge">${escapeHtml(item.category)}</span>
        ${wishBtn}
      </div>
      <div class="sw-title">${escapeHtml(item.title)}</div>
      <div class="sw-tagline">${escapeHtml(item.tagline || item.description)}</div>
      <div class="sw-meta">
        <span>⬇ ${item.totalDownloads || 0}</span>
        <span>${starString(item.ratingAverage)} ${item.ratingCount ? `(${item.ratingCount})` : ''}</span>
        <span class="sw-price">${fmtPrice(item)}</span>
      </div>
    </a>
  `;
}

function attachWishlistHandlers(container, user, onToggle) {
  container.querySelectorAll('[data-wishlist]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!user) { window.location.href = (location.pathname.includes('/admin/') ? '../' : '') + 'login.html'; return; }
      const softwareId = btn.dataset.wishlist;
      try {
        const { wishlist } = await api.post(`/users/wishlist/${softwareId}`);
        const isNowWishlisted = wishlist.includes(softwareId);
        btn.classList.toggle('active', isNowWishlisted);
        btn.textContent = isNowWishlisted ? '❤' : '♡';
        if (onToggle) onToggle(wishlist);
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  });
}
