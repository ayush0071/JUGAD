const jwt = require('jsonwebtoken');

const generateToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '30d' });

const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id, user.role);
  const cookieDays = Number(process.env.COOKIE_EXPIRES_DAYS) || 30;
  res.cookie('token', token, {
    expires: new Date(Date.now() + cookieDays * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id, name: user.name, email: user.email, role: user.role,
      avatar: user.avatar, phone: user.phone, location: user.location, bio: user.bio,
      emailNotifications: user.emailNotifications, wishlist: user.wishlist,
      purchasedSoftware: user.purchasedSoftware, savedPaymentMethods: user.savedPaymentMethods,
      createdAt: user.createdAt,
    },
  });
};

module.exports = { generateToken, sendTokenResponse };
