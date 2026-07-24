(async function () {
  const admin = await renderAdminSidebar('software');
  if (!admin) return;

  const wrap = document.getElementById('software-table');
  await load();

  async function load() {
    wrap.innerHTML = loaderHTML();
    const { data: items } = await api.get('/admin/software');

    if (items.length === 0) {
      wrap.innerHTML = emptyHTML('No software uploaded yet.');
      return;
    }

    const rows = items.map((it) => `
      <tr>
        <td style="font-weight:600;">${escapeHtml(it.title)}</td>
        <td class="text-dim" style="text-transform:capitalize;">${escapeHtml(it.category)}</td>
        <td>${it.isFree ? 'Free' : '₹' + it.price}</td>
        <td>${it.versions.length}</td>
        <td><span class="badge ${it.status === 'published' ? 'badge-glow' : 'badge-muted'}">${it.status}</span></td>
        <td>${it.totalDownloads}</td>
        <td style="text-align:right;">
          <a href="software-form.html?id=${it._id}" class="link-btn" style="margin-right:12px;">Edit</a>
          <button class="link-btn" style="color:var(--danger);" data-delete="${it._id}" data-title="${escapeHtml(it.title)}">Delete</button>
        </td>
      </tr>
    `).join('');

    wrap.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Title</th><th>Category</th><th>Price</th><th>Versions</th><th>Status</th><th>Downloads</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;

    wrap.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm(`Delete "${btn.dataset.title}"? This also deletes its uploaded files. This cannot be undone.`)) return;
        try {
          await api.delete(`/admin/software/${btn.dataset.delete}`);
          toast('Software deleted');
          load();
        } catch (err) {
          toast(err.message, 'error');
        }
      });
    });
  }
})();
