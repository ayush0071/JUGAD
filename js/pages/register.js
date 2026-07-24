(async function () {
  await initPage('');

  const form = document.getElementById('register-form');
  const submitBtn = document.getElementById('submit-btn');

  const existing = await Auth.currentUser();
  if (existing) {
    window.location.href = existing.role === 'admin' ? 'admin/index.html' : 'dashboard.html';
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';
    try {
      const name = document.getElementById('name').value;
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      await Auth.register(name, email, password);
      toast('Account created! Welcome to JUGAD.');
      window.location.href = 'dashboard.html';
    } catch (err) {
      toast(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create account';
    }
  });
})();
