(async function () {
  const adminExists = await Auth.adminExists();
  if (!adminExists) {
    window.location.href = 'setup.html';
    return;
  }

  const existing = await Auth.currentUser();
  if (existing && existing.role === 'admin') {
    window.location.href = 'index.html';
    return;
  }

  const form = document.getElementById('admin-login-form');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Verifying...';
    try {
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const user = await Auth.login(email, password);
      if (user.role !== 'admin') {
        await Auth.logout();
        throw new Error('This account does not have admin access.');
      }
      toast('Welcome back, admin.');
      window.location.href = 'index.html';
    } catch (err) {
      toast(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enter admin panel';
    }
  });
})();
