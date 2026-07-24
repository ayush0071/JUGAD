(async function () {
  await initPage('');

  const root = document.getElementById('detail-root');
  const slug = qs('slug');
  if (!slug) { root.innerHTML = emptyHTML('No software specified.'); return; }

  root.innerHTML = loaderHTML('Loading software details');

  let item;
  try {
    ({ data: item } = await api.get(`/software/${encodeURIComponent(slug)}`));
  } catch {
    root.innerHTML = emptyHTML('Software not found.');
    return;
  }

  const [{ data: reviews }, user] = await Promise.all([
    api.get(`/reviews/software/${item._id}`),
    Auth.currentUser(),
  ]);

  const versions = [...item.versions].sort((a, b) => new Date(b.releasedAt) - new Date(a.releasedAt));
  const isFree = item.isFree || item.price === 0;
  let owns = user ? (user.purchasedSoftware || []).some(p => String(p.software?._id || p.software) === String(item._id)) : false;
  let isWishlisted = user ? (user.wishlist || []).map(String).includes(String(item._id)) : false;

  function renderVersionRow(v) {
    const canDownload = isFree || owns;
    return `
      <div class="card version-row mb-2">
        <div>
          <p style="font-weight:700;">v${escapeHtml(v.versionNumber)} ${v.isLatest ? '<span class="badge badge-glow" style="margin-left:6px;">Latest</span>' : ''}</p>
          <p class="text-dim" style="font-size:13px; text-transform:capitalize;">${escapeHtml(v.platform)} · ${fmtBytes(v.fileSize)} · ${v.downloadCount} downloads</p>
          ${v.changelog ? `<p class="text-faint mt-1" style="font-size:13px;">${escapeHtml(v.changelog)}</p>` : ''}
        </div>
        ${canDownload
          ? `<button class="btn btn-outline btn-sm" data-download="${v._id}">⬇ Download</button>`
          : `<span class="text-faint" style="font-size:13px;">🔒 Locked</span>`}
      </div>
    `;
  }

  function renderReview(r) {
    return `
      <div class="review-card">
        <div class="review-head">
          <div class="flex gap-sm align-center">
            <div class="t-avatar" style="width:28px;height:28px;font-size:11px;">${escapeHtml(r.userName?.[0] || '?')}</div>
            <span style="font-weight:600; font-size:13px;">${escapeHtml(r.userName || 'Anonymous')}</span>
          </div>
          <span class="text-faint" style="font-size:12px;">${fmtDate(r.createdAt)}</span>
        </div>
        <div class="stars" style="margin:6px 0;">${starString(r.rating)}</div>
        <p class="text-dim" style="font-size:14px;">${escapeHtml(r.comment)}</p>
      </div>
    `;
  }

  root.innerHTML = `
    <div class="detail-grid fade-up">
      <div>
        <div class="sw-cover" style="aspect-ratio:16/9; font-size:48px; margin-bottom:22px;">
          ${item.coverImage ? `<img src="${item.coverImage}" alt="${escapeHtml(item.title)}" />` : escapeHtml(item.title[0])}
        </div>

        <div class="flex flex-between mb-2">
          <span class="badge" style="display:inline-block;">${escapeHtml(item.category)}</span>
          <button class="icon-btn ${isWishlisted ? 'active' : ''}" id="detail-wishlist-btn">${isWishlisted ? '❤ Saved' : '♡ Save'}</button>
        </div>
        <h1 class="mb-1">${escapeHtml(item.title)}</h1>
        <p class="text-dim mb-1">${escapeHtml(item.tagline || '')}</p>
        <p class="text-faint mb-3" style="font-size:13px;">by ${escapeHtml(item.developer)}</p>

        <div class="flex gap-lg mb-4 text-dim" style="font-size:14px;">
          <span>⬇ ${item.totalDownloads} downloads</span>
          <span>${starString(item.ratingAverage)} ${item.ratingAverage.toFixed(1)} (${item.ratingCount} reviews)</span>
        </div>

        <h2 class="mb-2" style="font-size:19px;">About this software</h2>
        <p class="text-dim mb-4" style="line-height:1.75; white-space:pre-line;">${escapeHtml(item.description)}</p>

        <h2 class="mb-3" style="font-size:19px;">Versions</h2>
        <div id="versions-wrap" class="mb-4">
          ${versions.length ? versions.map(renderVersionRow).join('') : emptyHTML('No versions uploaded yet.')}
        </div>

        <h2 class="mb-3" style="font-size:19px;">Reviews (${reviews.length})</h2>
        <div class="card-flat mb-3" id="review-form-wrap"></div>
        <div class="card-flat" id="reviews-wrap">
          ${reviews.length ? reviews.map(renderReview).join('') : emptyHTML('No reviews yet — be the first to leave one.')}
        </div>
      </div>

      <aside class="card buy-box">
        <p class="text-dim mb-1" style="font-size:13px;">Price</p>
        <p class="sw-price mb-3" style="font-size:30px;">
          ${isFree ? 'Free' : item.discountPrice > 0
            ? `₹${item.discountPrice} <span class="text-faint" style="font-size:16px; text-decoration:line-through; margin-left:6px;">₹${item.price}</span>`
            : `₹${item.price}`}
        </p>
        <div id="buy-action"></div>
        <ul class="text-dim mt-3" style="font-size:13px; line-height:2; list-style:none;">
          <li>✓ Lifetime access to version updates</li>
          <li>✓ Coupon codes supported at checkout</li>
          <li>✓ Instant download once payment is confirmed</li>
        </ul>
      </aside>
    </div>
  `;

  document.getElementById('detail-wishlist-btn').addEventListener('click', async () => {
    if (!user) return window.location.href = 'login.html';
    try {
      const { wishlist } = await api.post(`/users/wishlist/${item._id}`);
      isWishlisted = wishlist.map(String).includes(String(item._id));
      const btn = document.getElementById('detail-wishlist-btn');
      btn.classList.toggle('active', isWishlisted);
      btn.textContent = isWishlisted ? '❤ Saved' : '♡ Save';
      toast(isWishlisted ? 'Added to wishlist' : 'Removed from wishlist');
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  // Review form
  const reviewFormWrap = document.getElementById('review-form-wrap');
  if (!user) {
    reviewFormWrap.innerHTML = `<p class="text-dim" style="font-size:14px;"><a href="login.html" style="color:var(--accent); font-weight:600;">Log in</a> to leave a review.</p>`;
  } else {
    const alreadyReviewed = reviews.some(r => String(r.user) === String(user.id) || String(r.user) === String(user._id));
    if (alreadyReviewed) {
      reviewFormWrap.innerHTML = `<p class="text-dim" style="font-size:14px;">✓ You've already reviewed this software. Thanks!</p>`;
    } else {
      reviewFormWrap.innerHTML = `
        <p class="mb-1" style="font-weight:600; font-size:14px;">Leave a review</p>
        <div class="rating-input" id="rating-input">${[1,2,3,4,5].map(n => `<span data-star="${n}">★</span>`).join('')}</div>
        <textarea id="review-comment" placeholder="What did you think?" rows="3"></textarea>
        <button class="btn btn-primary btn-sm mt-2" id="submit-review-btn">Post review</button>
      `;
      let selectedRating = 0;
      const stars = reviewFormWrap.querySelectorAll('[data-star]');
      stars.forEach(s => s.addEventListener('click', () => {
        selectedRating = Number(s.dataset.star);
        stars.forEach(st => st.classList.toggle('active', Number(st.dataset.star) <= selectedRating));
      }));
      document.getElementById('submit-review-btn').addEventListener('click', async () => {
        const comment = document.getElementById('review-comment').value.trim();
        if (selectedRating === 0) return toast('Pick a star rating first', 'error');
        if (!comment) return toast('Write a short comment', 'error');
        try {
          await api.post(`/reviews/software/${item._id}`, { rating: selectedRating, comment });
          toast('Review posted — thank you!');
          setTimeout(() => window.location.reload(), 500);
        } catch (err) {
          toast(err.message, 'error');
        }
      });
    }
  }

  const buyAction = document.getElementById('buy-action');
  let myPendingOrder = null;
  if (user && !owns && !isFree) {
    try {
      const { data } = await api.get(`/orders/pending/${item._id}`);
      myPendingOrder = data;
    } catch {}
  }

  if (owns) {
    buyAction.innerHTML = `<div class="badge badge-glow" style="display:block; text-align:center; padding:12px; font-size:13px;">✓ You own this software</div>`;
  } else if (isFree) {
    buyAction.innerHTML = `<button class="btn btn-primary btn-block" id="free-download-btn">Download for free</button>`;
    document.getElementById('free-download-btn').addEventListener('click', () => {
      if (!user) return window.location.href = 'login.html';
      if (versions[0]) handleDownload(versions[0]._id);
    });
  } else if (myPendingOrder) {
    buyAction.innerHTML = `
      <div class="card-flat" style="background:var(--warn-soft); border-color:#f1dfb3; text-align:center; padding:14px;">
        <p style="font-size:13px; font-weight:700; color:var(--warn);">⏳ Payment pending confirmation</p>
        <p class="text-dim mt-1" style="font-size:12px;">The admin needs to confirm your payment before the download unlocks. You'll get a notification once it's approved.</p>
      </div>
    `;
  } else {
    buyAction.innerHTML = `<button class="btn btn-primary btn-block" id="buy-btn">Buy now</button>`;
    document.getElementById('buy-btn').addEventListener('click', () => {
      if (!user) return window.location.href = 'login.html';
      openCheckoutModal();
    });
  }

  root.querySelectorAll('[data-download]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!user) return window.location.href = 'login.html';
      if (!isFree && !owns) return toast('This software unlocks once the admin confirms your payment.', 'error');
      handleDownload(btn.dataset.download);
    });
  });

  async function handleDownload(versionId) {
    try {
      await api.downloadFile(`/software/${item._id}/download/${versionId}`, item.title);
      toast('Download started');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function openCheckoutModal() {
    const basePrice = item.discountPrice > 0 ? item.discountPrice : item.price;
    const settings = await getSettings();
    const hasRealUpi = Boolean(settings.upiId || settings.qrImage);

    let appliedCouponCode = null;
    let finalPrice = basePrice;
    let discountAmount = 0;
    let selectedMethod = 'gpay';

    const methods = [
      { key: 'gpay', icon: '🟢', label: 'GPay' }, { key: 'phonepe', icon: '🔵', label: 'PhonePe' },
      { key: 'paytm', icon: '⬜', label: 'Paytm' }, { key: 'upi', icon: '🅿️', label: 'UPI ID' },
      { key: 'card', icon: '💳', label: 'Card' }, { key: 'netbanking', icon: '🏦', label: 'Net banking' },
    ];
    const manualUpiMethods = ['gpay', 'phonepe', 'paytm', 'upi'];

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box fade-up">
        <h2 class="mb-2" style="font-size:19px;">Checkout</h2>
        <div class="card-flat mb-2" style="padding:14px;">
          <div class="flex flex-between mb-1"><span class="text-dim" style="font-size:13px;">Price</span><span id="row-base" style="font-size:13px;">₹${basePrice}</span></div>
          <div class="flex flex-between mb-1" id="row-discount" style="display:none;"><span class="text-dim" style="font-size:13px;">Coupon discount</span><span style="font-size:13px; color:var(--glow);">−₹0</span></div>
          <div class="flex flex-between" style="border-top:1px solid var(--border); padding-top:8px; margin-top:4px;"><strong>Total</strong><strong id="checkout-price">₹${basePrice}</strong></div>
        </div>
        <div class="coupon-row">
          <input class="input" id="coupon-input" placeholder="Coupon code" />
          <button class="btn btn-outline btn-sm" id="apply-coupon-btn">Apply</button>
        </div>
        <div id="coupon-status"></div>
        <p class="mb-1 mt-2" style="font-size:13px; font-weight:600; color:var(--text-dim);">Choose payment method</p>
        <div class="pay-methods" id="pay-methods">
          ${methods.map((m, i) => `<div class="pay-method ${i === 0 ? 'selected' : ''}" data-method="${m.key}"><span class="pm-icon">${m.icon}</span>${m.label}</div>`).join('')}
        </div>
        <div id="method-detail" class="mb-2"></div>
        <div class="flex gap-md mt-2">
          <button class="btn btn-outline btn-block" id="cancel-checkout">Cancel</button>
          <button class="btn btn-primary btn-block" id="confirm-checkout">Pay ₹${basePrice} via GPay</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const priceEl = overlay.querySelector('#checkout-price');
    const rowDiscount = overlay.querySelector('#row-discount');
    const confirmBtn = overlay.querySelector('#confirm-checkout');
    const couponStatus = overlay.querySelector('#coupon-status');
    const methodDetail = overlay.querySelector('#method-detail');

    function renderMethodDetail() {
      const methodLabel = methods.find(m => m.key === selectedMethod)?.label || '';
      if (manualUpiMethods.includes(selectedMethod)) {
        if (hasRealUpi) {
          methodDetail.innerHTML = `
            <div class="card-flat" style="padding:14px; text-align:center;">
              ${settings.qrImage ? `<img src="${settings.qrImage}" alt="Payment QR code" style="width:150px; height:150px; object-fit:contain; margin:0 auto 10px; background:#fff; border-radius:8px; padding:6px; border:1px solid var(--border);" />` : ''}
              ${settings.upiId ? `<p style="font-size:13px; color:var(--text-dim);">Pay to UPI ID</p><p style="font-weight:700; font-size:15px; margin-bottom:8px;">${escapeHtml(settings.upiId)}</p>` : ''}
              <p class="text-faint" style="font-size:12px;">Open ${escapeHtml(methodLabel)} (or any UPI app), scan the QR or enter the ID above, pay ₹${finalPrice}, then confirm below.</p>
            </div>
            <p class="hint" style="text-align:center; margin-top:8px;">This is a direct, manual UPI payment to the site owner — not verified automatically. The order will show as "self-reported" until the admin confirms it in Orders.</p>
          `;
          confirmBtn.textContent = `I've completed the payment`;
        } else {
          methodDetail.innerHTML = `<div class="card-flat" style="padding:14px;"><span class="badge badge-warn mb-2" style="display:inline-block;">Test mode</span><p style="font-size:13px; color:var(--text-dim);">The site owner hasn't added a UPI ID or QR code yet (Admin → Settings), so this method can't accept a real payment right now. This will complete as a test order.</p></div>`;
          confirmBtn.textContent = `Pay ₹${finalPrice} via ${methodLabel} (test)`;
        }
        return;
      }
      const detailFields = {
        card: `<div class="flex gap-sm"><input class="input" placeholder="Card number" style="flex:2;" /><input class="input" placeholder="MM/YY" style="flex:1;" /><input class="input" placeholder="CVV" style="flex:1;" /></div>`,
        netbanking: `<select class="input"><option>State Bank of India</option><option>HDFC Bank</option><option>ICICI Bank</option><option>Axis Bank</option><option>Punjab National Bank</option></select>`,
      };
      methodDetail.innerHTML = `<span class="badge badge-warn mb-2" style="display:inline-block;">Test mode</span>${detailFields[selectedMethod] || ''}<p class="hint">No payment gateway is connected for ${escapeHtml(methodLabel)} — this completes as a test order.</p>`;
      confirmBtn.textContent = `Pay ₹${finalPrice} via ${methodLabel} (test)`;
    }
    renderMethodDetail();

    overlay.querySelectorAll('[data-method]').forEach(el => {
      el.addEventListener('click', () => {
        overlay.querySelectorAll('[data-method]').forEach(o => o.classList.remove('selected'));
        el.classList.add('selected');
        selectedMethod = el.dataset.method;
        renderMethodDetail();
      });
    });

    overlay.querySelector('#cancel-checkout').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('#apply-coupon-btn').addEventListener('click', async () => {
      const code = overlay.querySelector('#coupon-input').value.trim().toUpperCase();
      if (!code) return;
      try {
        const preview = await api.post('/orders/preview-coupon', { softwareId: item._id, couponCode: code });
        appliedCouponCode = preview.code;
        finalPrice = preview.finalPrice;
        discountAmount = preview.discount;
        priceEl.textContent = `₹${finalPrice}`;
        rowDiscount.style.display = 'flex';
        rowDiscount.querySelector('span:last-child').textContent = `−₹${discountAmount}`;
        renderMethodDetail();
        couponStatus.innerHTML = `<div class="coupon-applied mt-1"><span>✓ ${escapeHtml(preview.code)} applied</span><span>−₹${discountAmount}</span></div>`;
      } catch (err) {
        couponStatus.innerHTML = `<p style="color:var(--danger); font-size:13px; margin-top:6px;">${escapeHtml(err.message)}</p>`;
      }
    });

    confirmBtn.addEventListener('click', async () => {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Submitting...';
      try {
        const { finalPrice: serverFinalPrice, discount } = await api.post('/orders/create', {
          softwareId: item._id, paymentMethod: selectedMethod, couponCode: appliedCouponCode || undefined,
        });
        finalPrice = serverFinalPrice;
        if (discount > 0) {
          discountAmount = discount;
          rowDiscount.style.display = 'flex';
          rowDiscount.querySelector('span:last-child').textContent = `−₹${discountAmount}`;
          priceEl.textContent = `₹${finalPrice}`;
        }
        overlay.remove();
        showSuccessPopup(manualUpiMethods.includes(selectedMethod) && hasRealUpi);
      } catch (err) {
        toast(err.message, 'error');
        confirmBtn.disabled = false;
        renderMethodDetail();
      }
    });
  }

  function showSuccessPopup(isManualUpi) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box fade-up" style="text-align:center;">
        <div style="width:56px; height:56px; border-radius:50%; background:var(--warn-soft); display:flex; align-items:center; justify-content:center; font-size:28px; margin:0 auto 16px;">⏳</div>
        <h2 class="mb-2" style="font-size:20px;">Payment submitted!</h2>
        <p class="text-dim mb-3" style="font-size:14px;">
          ${isManualUpi ? "We've recorded your UPI payment. " : ''}The admin needs to confirm it before ${escapeHtml(item.title)} unlocks for download —
          you'll get a real-time notification the moment that happens.
        </p>
        <button class="btn btn-primary btn-block" id="success-continue-btn">Got it</button>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('success-continue-btn').addEventListener('click', () => window.location.reload());
  }
})();
