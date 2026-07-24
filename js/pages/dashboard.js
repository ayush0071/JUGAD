(async function () {
  await initPage('');
  if (!requireAuth('login.html')) return;

  let user = await Auth.currentUser();
  if (!user) { window.location.href = 'login.html'; return; }

  document.getElementById('greeting').textContent = `Hi, ${user.name.split(' ')[0]} 👋`;

  const tabButtons = document.querySelectorAll('.tab-btn');
  const content = document.getElementById('tab-content');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderTab(btn.dataset.tab);
    });
  });

  const PAYMENT_TYPES = {
    upi: { icon: '🅿️', label: 'UPI' }, gpay: { icon: '🟢', label: 'GPay' },
    phonepe: { icon: '🔵', label: 'PhonePe' }, paytm: { icon: '⬜', label: 'Paytm' }, card: { icon: '💳', label: 'Card' },
  };

  async function renderTab(tab) {
    content.innerHTML = loaderHTML();

    if (tab === 'library') {
      const { data: purchases } = await api.get('/users/library');
      if (purchases.length === 0) return content.innerHTML = emptyHTML("You haven't downloaded anything yet.");
      content.innerHTML = `<div class="grid-software">${purchases.filter(p => p.software).map(p => `
        <a href="software.html?slug=${encodeURIComponent(p.software.slug)}" class="card">
          <div style="font-weight:700;">${escapeHtml(p.software.title)}</div>
          <div class="text-dim mt-1" style="font-size:13px; text-transform:capitalize;">${escapeHtml(p.software.category)}</div>
          <div class="text-faint mt-2" style="font-size:12px;">Purchased ${fmtDate(p.purchasedAt)}</div>
        </a>
      `).join('')}</div>`;
    }

    if (tab === 'wishlist') {
      const { data: items } = await api.get('/users/wishlist');
      if (items.length === 0) return content.innerHTML = emptyHTML('Your wishlist is empty.');
      content.innerHTML = `<div class="grid-software">${items.map(i => `
        <a href="software.html?slug=${encodeURIComponent(i.slug)}" class="card">
          <div style="font-weight:700;">${escapeHtml(i.title)}</div>
          <div class="sw-price mt-2">${fmtPrice(i)}</div>
        </a>
      `).join('')}</div>`;
    }

    if (tab === 'orders') {
      const { data: orders } = await api.get('/orders/my');
      if (orders.length === 0) return content.innerHTML = emptyHTML('No orders yet.');
      content.innerHTML = orders.map(o => `
        <div class="card flex flex-between mb-2">
          <div>
            <div style="font-weight:700;">${escapeHtml(o.software?.title || 'Unknown software')}</div>
            <div class="text-faint" style="font-size:12px;">${fmtDateTime(o.createdAt)} ${o.paymentMethod ? '· via ' + escapeHtml(PAYMENT_TYPES[o.paymentMethod]?.label || o.paymentMethod) : ''}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:700; font-family:var(--font-display);">₹${(o.amount / 100).toFixed(2)}</div>
            <span class="badge ${o.status === 'paid' ? 'badge-glow' : o.status === 'pending' ? 'badge-warn' : 'badge-danger'}">${o.status === 'paid' ? 'confirmed' : o.status}</span>
          </div>
        </div>
      `).join('');
    }

    if (tab === 'payments') renderPaymentsTab();
    if (tab === 'profile') renderProfileTab();
  }

  async function renderPaymentsTab() {
    const methods = user.savedPaymentMethods || [];
    content.innerHTML = `
      <div class="mb-3">
        ${methods.length ? methods.map(m => `
          <div class="pm-card">
            <div class="pm-left">
              <div class="pm-badge">${PAYMENT_TYPES[m.type]?.icon || '💳'}</div>
              <div>
                <div style="font-weight:600; font-size:14px;">${escapeHtml(PAYMENT_TYPES[m.type]?.label || m.type)}</div>
                <div class="text-faint" style="font-size:12px;">${escapeHtml(m.label)}</div>
              </div>
            </div>
            <button class="link-btn" style="color:var(--danger);" data-remove-pm="${m._id}">Remove</button>
          </div>
        `).join('') : emptyHTML('No saved payment methods yet.')}
      </div>
      <div class="card-flat" style="max-width:420px;">
        <p class="mb-2" style="font-weight:600; font-size:14px;">Add a payment method label</p>
        <div class="field">
          <label for="pm-type">Type</label>
          <select id="pm-type" class="input">
            <option value="upi">UPI</option><option value="gpay">GPay</option>
            <option value="phonepe">PhonePe</option><option value="paytm">Paytm</option><option value="card">Card</option>
          </select>
        </div>
        <div class="field">
          <label for="pm-label">UPI ID / masked card number</label>
          <input id="pm-label" class="input" placeholder="e.g. yourname@upi or •••• 4242" />
        </div>
        <button class="btn btn-outline btn-sm" id="add-pm-btn">+ Save payment method</button>
        <p class="hint">This is just a saved label for your convenience — actual payment still happens directly to the site owner's real UPI ID at checkout.</p>
      </div>
    `;

    content.querySelectorAll('[data-remove-pm]').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          const { data } = await api.delete(`/users/payment-methods/${btn.dataset.removePm}`);
          user.savedPaymentMethods = data;
          toast('Payment method removed');
          renderPaymentsTab();
        } catch (err) { toast(err.message, 'error'); }
      });
    });

    document.getElementById('add-pm-btn').addEventListener('click', async () => {
      const type = document.getElementById('pm-type').value;
      const label = document.getElementById('pm-label').value.trim();
      if (!label) return toast('Enter a UPI ID or card number', 'error');
      try {
        const { data } = await api.post('/users/payment-methods', { type, label });
        user.savedPaymentMethods = data;
        toast('Payment method saved');
        renderPaymentsTab();
      } catch (err) { toast(err.message, 'error'); }
    });
  }

  async function renderProfileTab() {
    const stats = [
      { label: 'Owned software', value: (user.purchasedSoftware || []).length },
      { label: 'Wishlist items', value: (user.wishlist || []).length },
      { label: 'Reviews written', value: '—' },
      { label: 'Orders placed', value: '—' },
    ];
    try {
      const { data: orders } = await api.get('/orders/my');
      stats[3].value = orders.length;
    } catch {}

    content.innerHTML = `
      <div class="card mb-3 profile-banner">
        <div class="profile-header">
          <div class="avatar-circle" id="avatar-display">
            ${user.avatar ? `<img src="${user.avatar}" alt="Avatar" />` : escapeHtml(user.name?.[0]?.toUpperCase() || '?')}
          </div>
          <div style="flex:1;">
            <p style="font-size:19px; font-weight:700;">${escapeHtml(user.name)}</p>
            <p class="text-dim" style="font-size:13px;">${escapeHtml(user.email)}</p>
            ${user.bio ? `<p class="text-dim mt-1" style="font-size:13px; max-width:480px;">${escapeHtml(user.bio)}</p>` : ''}
            <label class="avatar-upload-btn mt-1" style="display:inline-block;">
              Change photo
              <input type="file" id="avatar-input" accept="image/*" style="display:none;" />
            </label>
          </div>
          <div class="text-faint" style="font-size:12px; text-align:right;">Member since<br><strong style="color:var(--text); font-size:13px;">${fmtDate(user.createdAt)}</strong></div>
        </div>
        <div class="profile-stat-row mt-3">
          ${stats.map(s => `<div class="profile-stat"><div class="num">${s.value}</div><div class="label">${s.label}</div></div>`).join('')}
        </div>
      </div>

      <div class="profile-grid">
        <div>
          <div class="card mb-3">
            <p class="mb-2" style="font-weight:700; font-size:15px;">Basic info</p>
            <div class="field"><label for="profile-name">Name</label><input id="profile-name" class="input" value="${escapeHtml(user.name)}" /></div>
            <div class="field"><label>Email</label><input class="input" value="${escapeHtml(user.email)}" disabled style="opacity:.6;" /><p class="hint">Email can't be changed here — contact support to update it.</p></div>
            <div class="flex gap-md wrap">
              <div class="field" style="flex:1; min-width:160px;"><label for="profile-phone">Phone (optional)</label><input id="profile-phone" class="input" value="${escapeHtml(user.phone || '')}" placeholder="+91 98765 43210" /></div>
              <div class="field" style="flex:1; min-width:160px;"><label for="profile-location">Location (optional)</label><input id="profile-location" class="input" value="${escapeHtml(user.location || '')}" placeholder="City, Country" /></div>
            </div>
            <div class="field"><label for="profile-bio">Bio (optional)</label><textarea id="profile-bio" rows="3" placeholder="A short line about yourself">${escapeHtml(user.bio || '')}</textarea></div>
            <button class="btn btn-primary btn-sm" id="save-profile-btn">Save changes</button>
          </div>

          <div class="card mb-3">
            <p class="mb-2" style="font-weight:700; font-size:15px;">Change password</p>
            <div class="field"><label for="current-password">Current password</label><input type="password" id="current-password" class="input" /></div>
            <div class="field"><label for="new-password">New password</label><input type="password" id="new-password" class="input" minlength="8" /></div>
            <button class="btn btn-outline btn-sm" id="change-password-btn">Update password</button>
            <p class="hint">Forgot your current password instead? <a href="forgot-password.html" style="color:var(--accent);">Reset it by email</a>.</p>
          </div>
        </div>

        <div>
          <div class="card mb-3">
            <p class="mb-2" style="font-weight:700; font-size:15px;">Notifications</p>
            <div class="flex flex-between">
              <span style="font-size:14px;">Email me about new software</span>
              <label class="switch"><input type="checkbox" id="email-notif-toggle" ${user.emailNotifications !== false ? 'checked' : ''} /><span class="switch-slider"></span></label>
            </div>
          </div>
          <div class="card mb-3">
            <p class="mb-2" style="font-weight:700; font-size:15px;">Saved payment methods</p>
            <p class="text-dim" style="font-size:13px;">Manage these from the "Payment Methods" tab.</p>
          </div>
          <div class="danger-zone">
            <p class="mb-2" style="font-weight:700; font-size:15px; color:var(--danger);">Delete account</p>
            <p class="text-dim mb-3" style="font-size:13px;">Permanently deletes your account from the server.</p>
            <button class="btn btn-danger btn-sm" id="delete-account-btn">Delete my account</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('avatar-input').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) return toast('Please use an image under 2MB', 'error');
      const fd = new FormData();
      fd.append('avatar', file);
      try {
        const { user: fresh } = await api.put('/auth/profile', fd, true);
        user = fresh;
        document.getElementById('avatar-display').innerHTML = `<img src="${fresh.avatar}" alt="Avatar" />`;
        toast('Profile photo updated');
      } catch (err) { toast(err.message, 'error'); }
    });

    document.getElementById('save-profile-btn').addEventListener('click', async () => {
      const name = document.getElementById('profile-name').value.trim();
      if (!name) return toast('Name cannot be empty', 'error');
      try {
        const fd = new FormData();
        fd.append('name', name);
        fd.append('phone', document.getElementById('profile-phone').value.trim());
        fd.append('location', document.getElementById('profile-location').value.trim());
        fd.append('bio', document.getElementById('profile-bio').value.trim());
        const { user: fresh } = await api.put('/auth/profile', fd, true);
        user = fresh;
        document.getElementById('greeting').textContent = `Hi, ${user.name.split(' ')[0]} 👋`;
        toast('Profile updated');
        renderProfileTab();
      } catch (err) { toast(err.message, 'error'); }
    });

    document.getElementById('change-password-btn').addEventListener('click', async () => {
      const current = document.getElementById('current-password').value;
      const next = document.getElementById('new-password').value;
      if (!current || !next) return toast('Fill in both password fields', 'error');
      try {
        await Auth.changePassword(current, next);
        toast('Password updated');
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
      } catch (err) { toast(err.message, 'error'); }
    });

    document.getElementById('email-notif-toggle').addEventListener('change', async (e) => {
      try {
        await api.put('/auth/notification-pref', { emailNotifications: e.target.checked });
        toast(e.target.checked ? 'Email notifications on' : 'Email notifications off');
      } catch (err) { toast(err.message, 'error'); }
    });

    document.getElementById('delete-account-btn').addEventListener('click', async () => {
      if (!confirm('This permanently deletes your account. This cannot be undone. Continue?')) return;
      await Auth.deleteAccount();
      toast('Account deleted');
      setTimeout(() => window.location.href = 'index.html', 500);
    });
  }

  renderTab('library');
})();
