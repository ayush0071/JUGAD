(async function () {
  const admin = await renderAdminSidebar('developers');
  if (!admin) return;

  const form = document.getElementById('developer-form');
  const listWrap = document.getElementById('developers-list');
  const photoInput = document.getElementById('dev-photo');

  photoInput.addEventListener('change', () => {
    const file = photoInput.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast('Please use an image under 2MB', 'error'); photoInput.value = ''; return; }
    const reader = new FileReader();
    reader.onload = () => {
      document.getElementById('dev-preview').src = reader.result;
      document.getElementById('dev-preview-wrap').style.display = 'block';
    };
    reader.readAsDataURL(file);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('dev-name').value.trim();
    if (!name) return toast('Name is required', 'error');

    try {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('bio', document.getElementById('dev-bio').value.trim());
      if (photoInput.files[0]) fd.append('photo', photoInput.files[0]);
      await api.post('/admin/developers', fd, true);
      toast('Developer added');
      form.reset();
      document.getElementById('dev-preview-wrap').style.display = 'none';
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  async function load() {
    listWrap.innerHTML = loaderHTML();
    const { data: developers } = await api.get('/developers');

    if (developers.length === 0) {
      listWrap.innerHTML = emptyHTML('No developers added yet.');
      return;
    }

    listWrap.innerHTML = developers.map(d => `
      <div class="card flex flex-between mb-2">
        <div class="flex gap-md align-center">
          <div class="avatar-circle" style="width:48px; height:48px; font-size:18px;">
            ${d.photo ? `<img src="${d.photo}" alt="${escapeHtml(d.name)}" />` : escapeHtml(d.name[0]?.toUpperCase() || '?')}
          </div>
          <div>
            <p style="font-weight:700;">${escapeHtml(d.name)}</p>
            <p class="text-dim" style="font-size:12px;">${escapeHtml(d.bio || '')}</p>
          </div>
        </div>
        <button class="link-btn" style="color:var(--danger);" data-delete="${d._id}">Remove</button>
      </div>
    `).join('');

    listWrap.querySelectorAll('[data-delete]').forEach(btn => btn.addEventListener('click', async () => {
      if (!confirm('Remove this developer from the homepage?')) return;
      try { await api.delete(`/admin/developers/${btn.dataset.delete}`); toast('Developer removed'); load(); }
      catch (err) { toast(err.message, 'error'); }
    }));
  }

  load();
})();
