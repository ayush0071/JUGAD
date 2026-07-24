(async function () {
  const admin = await renderAdminSidebar('coupons');
  if (!admin) return;

  const form = document.getElementById('coupon-form');
  const wrap = document.getElementById('coupons-table');

  async function load() {
    wrap.innerHTML = loaderHTML();
    const { data: coupons } = await api.get('/admin/coupons');

    if (coupons.length === 0) {
      wrap.innerHTML = emptyHTML('No coupons yet.');
      return;
    }

    wrap.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Code</th><th>Discount</th><th>Usage</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${coupons.map(c => `
              <tr>
                <td style="font-weight:700;">${escapeHtml(c.code)}</td>
                <td>${c.type === 'percent' ? c.value + '% off' : '₹' + c.value + ' off'}</td>
                <td>${c.usedCount || 0}${c.usageLimit > 0 ? ' / ' + c.usageLimit : ' / ∞'}</td>
                <td><span class="badge ${c.active ? 'badge-glow' : 'badge-muted'}">${c.active ? 'Active' : 'Disabled'}</span></td>
                <td style="text-align:right;">
                  <button class="link-btn" data-toggle="${c._id}">${c.active ? 'Disable' : 'Enable'}</button>
                  <button class="link-btn" style="color:var(--danger); margin-left:10px;" data-delete="${c._id}">Delete</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    wrap.querySelectorAll('[data-toggle]').forEach(btn => btn.addEventListener('click', async () => {
      try { await api.put(`/admin/coupons/${btn.dataset.toggle}/toggle`); load(); }
      catch (err) { toast(err.message, 'error'); }
    }));
    wrap.querySelectorAll('[data-delete]').forEach(btn => btn.addEventListener('click', async () => {
      if (!confirm('Delete this coupon?')) return;
      try { await api.delete(`/admin/coupons/${btn.dataset.delete}`); toast('Coupon deleted'); load(); }
      catch (err) { toast(err.message, 'error'); }
    }));
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/coupons', {
        code: document.getElementById('code').value.trim().toUpperCase(),
        type: document.getElementById('type').value,
        value: Number(document.getElementById('value').value),
        usageLimit: Number(document.getElementById('usageLimit').value) || 0,
      });
      toast('Coupon created');
      form.reset();
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  load();
})();
