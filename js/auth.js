const Auth = {
  _cachedUser: undefined, // undefined = not fetched yet this page load, null = confirmed logged out

  async currentUser() {
    if (this._cachedUser !== undefined) return this._cachedUser;
    const token = localStorage.getItem('jugad_token');
    if (!token) { this._cachedUser = null; return null; }
    try {
      const { user } = await api.get('/auth/me');
      this._cachedUser = user;
      return user;
    } catch {
      localStorage.removeItem('jugad_token');
      this._cachedUser = null;
      return null;
    }
  },

  async adminExists() {
    const { exists } = await api.get('/auth/admin-exists');
    return exists;
  },

  async setupAdmin(name, email, password) {
    const data = await api.post('/auth/setup', { name, email, password });
    localStorage.setItem('jugad_token', data.token);
    this._cachedUser = data.user;
    return data.user;
  },

  async register(name, email, password) {
    const data = await api.post('/auth/register', { name, email, password });
    localStorage.setItem('jugad_token', data.token);
    this._cachedUser = data.user;
    return data.user;
  },

  async login(email, password) {
    const data = await api.post('/auth/login', { email, password });
    localStorage.setItem('jugad_token', data.token);
    this._cachedUser = data.user;
    return data.user;
  },

  async logout() {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('jugad_token');
    this._cachedUser = null;
  },

  async changePassword(currentPassword, newPassword) {
    return api.put('/auth/update-password', { currentPassword, newPassword });
  },

  async deleteAccount() {
    await api.delete('/auth/me');
    localStorage.removeItem('jugad_token');
    this._cachedUser = null;
  },

  async requestPasswordReset(email) {
    return api.post('/auth/forgot-password', { email });
  },

  async resetPasswordWithOtp(email, otp, newPassword) {
    return api.post('/auth/reset-password', { email, otp, newPassword });
  },
};
