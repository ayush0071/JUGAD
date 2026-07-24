(async function () {
  const admin = await renderAdminSidebar('orders');
  if (!admin) return;

  const wrap = document.getElementById('orders-table');
  await load();

  async function load() {
    wrap.innerHTML = loaderHTML();
    const { data: orders } = await api.get('/admin/orders');

    if (orders.length === 0) {
      wrap.innerHTML = emptyHTML('No orders yet.');
      return;
    }

    const methodLabels = { gpay: 'GPay', phonepe: 'PhonePe', paytm: 'Paytm', upi: 'UPI', card: 'Card', netbanking: 'Net banking' };

    const rows = orders.map((o) => {
      const statusBadge = o.status === 'paid' ? `<span class="badge badge-glow">Confirmed</span>`
        : o.status === 'rejected' ? `<span class="badge badge-danger">Rejected</span>`
        : `<span class="badge badge-warn">Pending</span>`;
      const verificationBadge = o.verification === 'self-reported' ? `<span class="badge badge-warn">Self-reported UPI</span>`
        : o.verification === 'admin-verified' ? `<span class="badge badge-glow">Admin verified</span>`
        : `<span class="badge badge-muted">Test order</span>`;

      return `
        <tr>
          <td>${escapeHtml(o.user?.name || 'Unknown')}<br><span class="text-faint" style="font-size:11px;">${escapeHtml(o.user?.email || '')}</span></td>
          <td>${escapeHtml(o.software?.title || 'Unknown')}</td>
          <td>₹${(o.amount / 100).toFixed(2)}${o.couponCode ? `<br><span class="text-faint" style="font-size:11px;">coupon: ${escapeHtml(o.couponCode)}</span>` : ''}</td>
          <td class="text-dim">${escapeHtml(methodLabels[o.paymentMethod] || o.paymentMethod || '—')}</td>
          <td>${verificationBadge}</td>
          <td>${statusBadge}</td>
          <td class="text-dim">${fmtDateTime(o.createdAt)}</td>
          <td style="text-align:right;">
            ${o.status === 'pending' ? `
              <button class="link-btn" data-confirm="${o._id}">Confirm payment</button>
              <button class="link-btn" style="color:var(--danger); margin-left:8px;" data-reject="${o._id}">Reject</button>
            ` : o.status === 'paid' ? `
              <button class="link-btn" style="color:var(--danger);" data-revoke="${o._id}">Revoke access</button>
            ` : ''}
          </td>
        </tr>
      `;
    }).join('');

    wrap.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>User</th><th>Software</th><th>Amount</th><th>Method</th><th>Verification</th><th>Status</th><th>Date</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;

    wrap.querySelectorAll('[data-confirm]').forEach(btn => btn.addEventListener('click', async () => {
      try {
        await api.post(`/admin/orders/${btn.dataset.confirm}/confirm`);
        toast('Payment confirmed — buyer can now download');
        load();
      } catch (err) { toast(err.message, 'error'); }
    }));

    wrap.querySelectorAll('[data-reject]').forEach(btn => btn.addEventListener('click', async () => {
      if (!confirm('Reject this order? The buyer will not get access.')) return;
      try {
        await api.post(`/admin/orders/${btn.dataset.reject}/reject`);
        toast('Order rejected');
        load();
      } catch (err) { toast(err.message, 'error'); }
    }));

    wrap.querySelectorAll('[data-revoke]').forEach(btn => btn.addEventListener('click', async () => {
      if (!confirm("This revokes the buyer's access to the software. Use this if payment wasn't actually received. Continue?")) return;
      try {
        await api.post(`/admin/orders/${btn.dataset.revoke}/revoke`);
        toast('Access revoked');
        load();
      } catch (err) { toast(err.message, 'error'); }
    }));
  }
})();
