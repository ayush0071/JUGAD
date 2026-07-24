(async function () {
  const admin = await renderAdminSidebar('reviews');
  if (!admin) return;

  const wrap = document.getElementById('reviews-list');
  await load();

  async function load() {
    wrap.innerHTML = loaderHTML();
    const { data: reviews } = await api.get('/admin/reviews');

    if (reviews.length === 0) {
      wrap.innerHTML = emptyHTML('No reviews yet.');
      return;
    }

    wrap.innerHTML = reviews.map(r => `
      <div class="card mb-2">
        <div class="flex flex-between mb-1">
          <div>
            <span style="font-weight:700;">${escapeHtml(r.software?.title || 'Unknown software')}</span>
            <span class="text-faint" style="font-size:12px; margin-left:8px;">by ${escapeHtml(r.userName)}</span>
          </div>
          <span class="badge ${r.status === 'hidden' ? 'badge-muted' : 'badge-glow'}">${r.status === 'hidden' ? 'Hidden' : 'Visible'}</span>
        </div>
        <div class="stars mb-1">${starString(r.rating)}</div>
        <p class="text-dim mb-2" style="font-size:14px;">${escapeHtml(r.comment)}</p>
        <div class="flex flex-between">
          <span class="text-faint" style="font-size:12px;">${fmtDateTime(r.createdAt)}</span>
          <div>
            <button class="link-btn" data-toggle="${r._id}">${r.status === 'hidden' ? 'Unhide' : 'Hide'}</button>
            <button class="link-btn" style="color:var(--danger); margin-left:10px;" data-delete="${r._id}">Delete</button>
          </div>
        </div>
      </div>
    `).join('');

    wrap.querySelectorAll('[data-toggle]').forEach(btn => btn.addEventListener('click', async () => {
      try { await api.put(`/admin/reviews/${btn.dataset.toggle}/toggle`); load(); }
      catch (err) { toast(err.message, 'error'); }
    }));
    wrap.querySelectorAll('[data-delete]').forEach(btn => btn.addEventListener('click', async () => {
      if (!confirm('Delete this review permanently?')) return;
      try { await api.delete(`/admin/reviews/${btn.dataset.delete}`); toast('Review deleted'); load(); }
      catch (err) { toast(err.message, 'error'); }
    }));
  }
})();
