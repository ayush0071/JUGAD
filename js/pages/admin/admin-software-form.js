(async function () {
  const admin = await renderAdminSidebar('software');
  if (!admin) return;

  const id = qs('id');
  const isEdit = Boolean(id);
  let current = null;

  const form = document.getElementById('software-form');
  const submitBtn = document.getElementById('submit-btn');
  const versionsSection = document.getElementById('versions-section');
  const versionsList = document.getElementById('versions-list');
  const versionForm = document.getElementById('version-form');

  if (isEdit) {
    document.getElementById('form-title').textContent = 'Edit software';
    submitBtn.textContent = 'Save changes';
    try {
      const { data } = await api.get(`/admin/software/${id}`);
      current = data;
      fillForm(current);
      versionsSection.style.display = 'block';
      renderVersions();
    } catch (err) {
      toast('Software not found', 'error');
      window.location.href = 'software.html';
      return;
    }
  }

  function fillForm(item) {
    document.getElementById('title').value = item.title;
    document.getElementById('tagline').value = item.tagline || '';
    document.getElementById('description').value = item.description;
    document.getElementById('category').value = item.category;
    document.getElementById('developer').value = item.developer;
    document.getElementById('tags').value = (item.tags || []).join(', ');
    document.getElementById('price').value = item.price;
    document.getElementById('discountPrice').value = item.discountPrice || 0;
    document.getElementById('isFree').checked = item.isFree;
    document.getElementById('featured').checked = item.featured;
    document.getElementById('status').value = item.status;
    if (item.coverImage) {
      document.getElementById('cover-preview').src = item.coverImage;
      document.getElementById('cover-preview-wrap').style.display = 'block';
    }
  }

  const coverInput = document.getElementById('coverImage');
  coverInput.addEventListener('change', () => {
    const file = coverInput.files[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { toast('Please use an image under 3MB', 'error'); coverInput.value = ''; return; }
    const reader = new FileReader();
    reader.onload = () => {
      document.getElementById('cover-preview').src = reader.result;
      document.getElementById('cover-preview-wrap').style.display = 'block';
    };
    reader.readAsDataURL(file);
  });

  function buildFormData() {
    const fd = new FormData();
    fd.append('title', document.getElementById('title').value.trim());
    fd.append('tagline', document.getElementById('tagline').value.trim());
    fd.append('description', document.getElementById('description').value.trim());
    fd.append('category', document.getElementById('category').value);
    fd.append('developer', document.getElementById('developer').value.trim());
    fd.append('tags', document.getElementById('tags').value.trim());
    fd.append('price', document.getElementById('price').value);
    fd.append('discountPrice', document.getElementById('discountPrice').value);
    fd.append('isFree', document.getElementById('isFree').checked);
    fd.append('featured', document.getElementById('featured').checked);
    fd.append('status', document.getElementById('status').value);
    if (coverInput.files[0]) fd.append('coverImage', coverInput.files[0]);
    return fd;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    try {
      const fd = buildFormData();
      if (isEdit) {
        const { data } = await api.put(`/admin/software/${id}`, fd, true);
        current = data;
        toast('Software updated');
        submitBtn.disabled = false;
      } else {
        const { data } = await api.post('/admin/software', fd, true);
        toast('Software created — now add a version file');
        window.location.href = `software-form.html?id=${data._id}`;
        return;
      }
    } catch (err) {
      toast(err.message, 'error');
      submitBtn.disabled = false;
    }
  });

  function renderVersions() {
    const versions = [...current.versions].sort((a, b) => new Date(b.releasedAt) - new Date(a.releasedAt));
    if (versions.length === 0) {
      versionsList.innerHTML = emptyHTML('No versions yet.');
      return;
    }
    versionsList.innerHTML = versions.map(v => `
      <div class="card flex flex-between mb-2">
        <div>
          <p style="font-weight:600;">v${escapeHtml(v.versionNumber)} ${v.isLatest ? '<span class="badge badge-glow" style="margin-left:6px;">latest</span>' : ''}</p>
          <p class="text-dim" style="font-size:12px; text-transform:capitalize;">${escapeHtml(v.platform)} · ${fmtBytes(v.fileSize)}</p>
        </div>
        <button class="link-btn" style="color:var(--danger);" data-delete-version="${v._id}">Delete</button>
      </div>
    `).join('');

    versionsList.querySelectorAll('[data-delete-version]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this version file?')) return;
        try {
          const { data } = await api.delete(`/admin/software/${current._id}/versions/${btn.dataset.deleteVersion}`);
          current = data;
          renderVersions();
          toast('Version removed');
        } catch (err) {
          toast(err.message, 'error');
        }
      });
    });
  }

  if (versionForm) {
    versionForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fileInput = document.getElementById('versionFile');
      const file = fileInput.files[0];
      if (!file) return toast('Choose a file to upload', 'error');

      const uploadBtn = document.getElementById('upload-version-btn');
      uploadBtn.disabled = true;
      uploadBtn.textContent = 'Uploading...';

      try {
        const fd = new FormData();
        fd.append('versionNumber', document.getElementById('versionNumber').value.trim());
        fd.append('changelog', document.getElementById('changelog').value.trim());
        fd.append('platform', document.getElementById('platform').value);
        fd.append('file', file);
        const { data } = await api.post(`/admin/software/${current._id}/versions`, fd, true);
        current = data;
        toast('Version uploaded');
        versionForm.reset();
        renderVersions();
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Upload version';
      }
    });
  }
})();
