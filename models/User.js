const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isActive: { type: Boolean, default: true },

    avatar: { type: String, default: '' },
    phone: { type: String, default: '' },
    location: { type: String, default: '' },
    bio: { type: String, default: '', maxlength: 300 },
    emailNotifications: { type: Boolean, default: true },
    savedPaymentMethods: [
      {
        type: { type: String, enum: ['upi', 'gpay', 'phonepe', 'paytm', 'card'] },
        label: String,
      },
    ],

    purchasedSoftware: [
      {
        software: { type: mongoose.Schema.Types.ObjectId, ref: 'Software' },
        order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
        purchasedAt: { type: Date, default: Date.now },
      },
    ],
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Software' }],

    otpCode: { type: String, select: false },
    otpExpiresAt: { type: Date, select: false },

    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,
    passwordChangedAt: Date,
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  if (!this.isNew) this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.isLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

module.exports = mongoose.model('User', userSchema);
