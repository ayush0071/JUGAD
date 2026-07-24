(async function () {
  await initPage('home');

  const user = await Auth.currentUser();
  const wishlist = (user?.wishlist || []).map(String);

  const grid = document.getElementById('featured-grid');
  grid.innerHTML = loaderHTML('Fetching featured tools');

  const [{ data: featured }, { data: allPublished }, settings] = await Promise.all([
    api.get('/software/featured'),
    api.get('/software?limit=1000'),
    getSettings(),
  ]);

  document.getElementById('stat-software').textContent = allPublished.length;
  document.getElementById('stat-downloads').textContent = allPublished.reduce((sum, s) => sum + (s.totalDownloads || 0), 0);
  document.getElementById('stat-developers').textContent = new Set(allPublished.map(s => s.developer)).size;

  // Ad banner
  const adSlot = document.getElementById('ad-banner-slot');
  if (settings.adBanner?.enabled && (settings.adBanner.title || settings.adBanner.image)) {
    const ad = settings.adBanner;
    adSlot.innerHTML = `
      <a href="${escapeHtml(ad.linkUrl || 'explore.html')}" class="ad-banner fade-up">
        ${ad.image ? `<img src="${ad.image}" alt="" class="ad-banner-img" />` : ''}
        <div class="ad-banner-text">
          <span class="badge" style="background:rgba(255,255,255,0.2); color:#fff;">Sponsored</span>
          <p class="ad-banner-title">${escapeHtml(ad.title)}</p>
          ${ad.subtitle ? `<p class="ad-banner-subtitle">${escapeHtml(ad.subtitle)}</p>` : ''}
        </div>
      </a>
    `;
  }

  if (featured.length === 0) {
    let adminExists = true;
    try { adminExists = await Auth.adminExists(); } catch {}
    grid.innerHTML = `
      <div class="empty" style="grid-column: 1 / -1;">
        <p class="mb-2" style="font-size:15px; font-weight:600; color:var(--text);">No software published yet</p>
        <p class="mb-3">This catalog is empty and ready for your first real listing.</p>
        <a href="${adminExists ? 'admin/login.html' : 'admin/setup.html'}" class="btn btn-primary btn-sm">
          ${adminExists ? 'Go to admin login' : 'Set up your admin account'}
        </a>
      </div>
    `;
  } else {
    grid.innerHTML = featured.map(item => renderSoftwareCard(item, { showWishlist: true, isWishlisted: wishlist.includes(String(item._id)) })).join('');
    attachWishlistHandlers(grid, user);
  }

  // Upcoming software
  const { data: comingSoon } = await api.get('/software/upcoming');
  if (comingSoon.length > 0) {
    document.getElementById('upcoming-section').style.display = 'block';
    document.getElementById('upcoming-grid').innerHTML = comingSoon.map((item, i) => `
      <div class="card fade-up upcoming-card" style="animation-delay:${i * 0.08}s;">
        <div class="sw-cover">
          ${item.coverImage ? `<img src="${item.coverImage}" alt="${escapeHtml(item.title)}" />` : escapeHtml(item.title[0] || '?')}
          <span class="coming-soon-ribbon">Coming soon</span>
        </div>
        <span class="badge">${escapeHtml(item.category)}</span>
        <div class="sw-title">${escapeHtml(item.title)}</div>
        <div class="sw-tagline">${escapeHtml(item.tagline || item.description)}</div>
        <button class="btn btn-outline btn-sm btn-block mt-2" data-notify="${item._id}">🔔 Notify me</button>
      </div>
    `).join('');

    document.getElementById('upcoming-grid').querySelectorAll('[data-notify]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!user) return window.location.href = 'login.html';
        try {
          await api.put('/auth/profile', { emailNotifications: true });
        } catch {}
        toast("You'll be notified when this launches!");
        btn.textContent = "✓ We'll notify you";
        btn.disabled = true;
      });
    });
  }

  // Developers
  const { data: developers } = await api.get('/developers');
  const devGrid = document.getElementById('developers-grid');
  if (developers.length === 0) {
    devGrid.innerHTML = `<p class="text-faint" style="grid-column:1/-1;">Developer profiles will appear here once the admin adds them.</p>`;
  } else {
    devGrid.innerHTML = developers.map((d, i) => `
      <div class="card developer-card fade-up" style="animation-delay:${i * 0.08}s;">
        <div class="avatar-circle" style="width:64px; height:64px; font-size:22px; margin:0 auto 12px;">
          ${d.photo ? `<img src="${d.photo}" alt="${escapeHtml(d.name)}" />` : escapeHtml(d.name[0]?.toUpperCase() || '?')}
        </div>
        <p style="font-weight:700; text-align:center;">${escapeHtml(d.name)}</p>
        <p class="text-dim" style="font-size:12px; text-align:center;">${escapeHtml(d.bio || '')}</p>
      </div>
    `).join('');
  }

  // Testimonials — continuously scrolling marquee (duplicated once for a seamless loop)
  const testimonials = [
    { stars: 5, quote: "Found a time-tracker here in five minutes that I'd been meaning to build myself for a year. Paid for itself the first week.", name: 'Rohit K.', role: 'Freelance electrician' },
    { stars: 5, quote: "As a student I don't have money to burn on software. Half the tools here are free and the paid ones are actually priced fairly.", name: 'Aditi S.', role: 'Engineering student' },
    { stars: 4, quote: "Uploaded my own tool here in an afternoon. Nice to have somewhere to put small utilities that don't deserve a whole startup.", name: 'Meera J.', role: 'Indie developer' },
    { stars: 5, quote: "The checkout with UPI just worked — scanned, paid, and my download unlocked once it was confirmed. Simple.", name: 'Karan V.', role: 'Small business owner' },
    { stars: 5, quote: "I run a two-person editing studio and the video trimmer tool alone saved us hours every week.", name: 'Sana P.', role: 'Video editor' },
    { stars: 4, quote: "Clean UI, no clutter, and I like that free and paid tools sit side by side without the free ones feeling second-class.", name: 'Devansh T.', role: 'Corporate analyst' },
  ];
  const track = document.getElementById('testimonial-track');
  const cardsHTML = testimonials.map(t => `
    <div class="testimonial-card-m">
      <div class="stars">${'★'.repeat(t.stars)}${'☆'.repeat(5 - t.stars)}</div>
      <p class="t-quote">"${escapeHtml(t.quote)}"</p>
      <div class="t-author"><div class="t-avatar">${escapeHtml(t.name.split(' ').map(w => w[0]).join(''))}</div><div><div class="t-name">${escapeHtml(t.name)}</div><div class="t-role">${escapeHtml(t.role)}</div></div></div>
    </div>
  `).join('');
  track.innerHTML = cardsHTML + cardsHTML;

  // FAQ accordion
  document.querySelectorAll('.faq-item').forEach(item => {
    item.addEventListener('click', () => {
      const wasOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });

  // Newsletter — real subscriber stored server-side, real email when admin publishes
  const newsletterForm = document.getElementById('newsletter-form');
  newsletterForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailInput = newsletterForm.querySelector('input[type="email"]');
    const email = emailInput.value.trim().toLowerCase();
    if (!email) return;
    try {
      await api.post('/subscribe', { email });
      if (user) await api.put('/auth/profile', { emailNotifications: true });
      toast("Subscribed! You'll get a real email when new software goes live (if the admin has configured email sending).");
      newsletterForm.reset();
    } catch (err) {
      toast(err.message || 'Could not subscribe — try again.', 'error');
    }
  });
})();
