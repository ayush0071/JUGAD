(async function () {
  await initPage('');

  const stepRequest = document.getElementById('step-request');
  const stepVerify = document.getElementById('step-verify');
  const verifySubtext = document.getElementById('verify-subtext');
  const fallbackNote = document.getElementById('otp-fallback-note');

  let currentEmail = '';

  async function sendOtpFlow(email) {
    const result = await Auth.requestPasswordReset(email);
    if (result.emailSent) {
      verifySubtext.textContent = `We sent a 6-digit code to ${email}. Check your inbox (and spam folder).`;
      fallbackNote.style.display = 'none';
    } else {
      verifySubtext.textContent = `Enter the code below to continue.`;
      fallbackNote.style.display = 'block';
      fallbackNote.innerHTML = `
        <div class="card-flat mb-2" style="background:var(--warn-soft); border-color:#f1dfb3;">
          <p style="font-size:13px; color:var(--warn); font-weight:600; margin-bottom:4px;">Email sending isn't configured on this server yet.</p>
          <p style="font-size:13px; color:var(--warn);">Your code is: <strong style="font-size:16px;">${result.devOtp}</strong></p>
        </div>
      `;
    }
  }

  document.getElementById('request-otp-btn').addEventListener('click', async () => {
    const email = document.getElementById('reset-email').value.trim();
    if (!email) return toast('Enter your email', 'error');
    const btn = document.getElementById('request-otp-btn');
    btn.disabled = true;
    btn.textContent = 'Sending...';
    try {
      currentEmail = email;
      await sendOtpFlow(email);
      stepRequest.style.display = 'none';
      stepVerify.style.display = 'block';
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Send code';
    }
  });

  document.getElementById('resend-otp-btn').addEventListener('click', async () => {
    try {
      await sendOtpFlow(currentEmail);
      toast('Code resent');
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  document.getElementById('reset-password-btn').addEventListener('click', async () => {
    const otp = document.getElementById('otp-code').value.trim();
    const newPassword = document.getElementById('new-password').value;
    if (!otp || !newPassword) return toast('Fill in both fields', 'error');

    const btn = document.getElementById('reset-password-btn');
    btn.disabled = true;
    btn.textContent = 'Resetting...';
    try {
      const result = await Auth.resetPasswordWithOtp(currentEmail, otp, newPassword);
      toast('Password reset! You can log in now.');
      setTimeout(() => {
        window.location.href = result.role === 'admin' ? 'admin/login.html' : 'login.html';
      }, 800);
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Reset password';
    }
  });
})();
