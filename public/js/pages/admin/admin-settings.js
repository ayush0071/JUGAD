(async function () {
  const admin = await renderAdminSidebar('settings');
  if (!admin) return;

  const { data: settings } = await api.get('/settings');

  document.getElementById('siteName').value = settings.siteName || '';
  document.getElementById('tagline').value = settings.tagline || '';
  document.getElementById('supportEmail').value = settings.supportEmail || '';
  document.getElementById('maintenanceMode').checked = !!settings.maintenanceMode;

  document.getElementById('upiId').value = settings.upiId || '';
  if (settings.qrImage) {
    document.getElementById('qr-preview').src = settings.qrImage;
    document.getElementById('qr-preview-wrap').style.display = 'block';
  }

  const adBanner = settings.adBanner || { enabled: false, title: '', subtitle: '', image: '', linkUrl: '' };
  document.getElementById('adEnabled').checked = !!adBanner.enabled;
  document.getElementById('adTitle').value = adBanner.title || '';
  document.getElementById('adSubtitle').value = adBanner.subtitle || '';
  document.getElementById('adLink').value = adBanner.linkUrl || '';
  if (adBanner.image) {
    document.getElementById('ad-preview').src = adBanner.image;
    document.getElementById('ad-preview-wrap').style.display = 'block';
  }

  document.getElementById('adImage').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast('Please use an image under 2MB', 'error'); e.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = () => {
      document.getElementById('ad-preview').src = reader.result;
      document.getElementById('ad-preview-wrap').style.display = 'block';
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('qrImage').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast('Please use an image under 2MB', 'error'); e.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = () => {
      document.getElementById('qr-preview').src = reader.result;
      document.getElementById('qr-preview-wrap').style.display = 'block';
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api.put('/admin/settings/general', {
        siteName: document.getElementById('siteName').value.trim() || 'JUGAD',
        tagline: document.getElementById('tagline').value.trim(),
        supportEmail: document.getElementById('supportEmail').value.trim(),
        maintenanceMode: document.getElementById('maintenanceMode').checked,
      });
      toast('Settings saved');
    } catch (err) { toast(err.message, 'error'); }
  });

  document.getElementById('payment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      fd.append('upiId', document.getElementById('upiId').value.trim());
      if (document.getElementById('qrImage').files[0]) fd.append('qrImage', document.getElementById('qrImage').files[0]);
      await api.put('/admin/settings/payment', fd, true);
      toast('Payment details saved');
    } catch (err) { toast(err.message, 'error'); }
  });

  document.getElementById('adbanner-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      fd.append('enabled', document.getElementById('adEnabled').checked);
      fd.append('title', document.getElementById('adTitle').value.trim());
      fd.append('subtitle', document.getElementById('adSubtitle').value.trim());
      fd.append('linkUrl', document.getElementById('adLink').value.trim());
      if (document.getElementById('adImage').files[0]) fd.append('image', document.getElementById('adImage').files[0]);
      await api.put('/admin/settings/ad-banner', fd, true);
      toast('Ad banner saved');
    } catch (err) { toast(err.message, 'error'); }
  });

  document.getElementById('reset-data-btn').addEventListener('click', () => {
    alert('Resetting all data on a real, shared server is a bigger deal than the old browser-only version — it affects every visitor, not just you. Do this directly against MongoDB (Atlas UI or mongosh), not through the admin panel. See the README for exact steps.');
  });
})();
