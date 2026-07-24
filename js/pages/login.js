(async function () {
  await initPage('');

  const form = document.getElementById('login-form');
  const submitBtn = document.getElementById('submit-btn');

  const existing = await Auth.currentUser();
  if (existing) {
    window.location.href = existing.role === 'admin' ? 'admin/index.html' : 'dashboard.html';
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';
    try {
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const user = await Auth.login(email, password);
      toast(`Welcome back, ${user.name.split(' ')[0]}!`);
      window.location.href = user.role === 'admin' ? 'admin/index.html' : 'dashboard.html';
    } catch (err) {
      toast(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Log in';
    }
  });
})();
