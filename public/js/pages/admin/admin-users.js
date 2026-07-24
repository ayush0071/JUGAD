(async function () {
  const admin = await renderAdminSidebar('users');
  if (!admin) return;

  const wrap = document.getElementById('users-table');
  await load();

  async function load() {
    wrap.innerHTML = loaderHTML();
    const { data: users } = await api.get('/admin/users');

    wrap.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th></th></tr></thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td>${escapeHtml(u.name)}</td>
                <td>${escapeHtml(u.email)}</td>
                <td style="text-transform:capitalize;">${escapeHtml(u.role)}</td>
                <td><span class="badge ${u.isActive ? 'badge-glow' : 'badge-danger'}">${u.isActive ? 'Active' : 'Deactivated'}</span></td>
                <td class="text-dim">${fmtDate(u.createdAt)}</td>
                <td style="text-align:right;">
                  ${u.role !== 'admin' ? `<button class="link-btn" data-toggle="${u._id}">${u.isActive ? 'Deactivate' : 'Activate'}</button>` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    wrap.querySelectorAll('[data-toggle]').forEach(btn => btn.addEventListener('click', async () => {
      try { await api.put(`/admin/users/${btn.dataset.toggle}/toggle-active`); load(); }
      catch (err) { toast(err.message, 'error'); }
    }));
  }
})();
