(async function () {
  const adminExists = await Auth.adminExists();
  if (adminExists) {
    window.location.href = 'login.html';
    return;
  }

  const form = document.getElementById('setup-form');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';
    try {
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim().toLowerCase();
      const password = document.getElementById('password').value;
      await Auth.setupAdmin(name, email, password);
      toast('Admin account created!');
      window.location.href = 'index.html';
    } catch (err) {
      toast(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create admin account';
    }
  });
})();
