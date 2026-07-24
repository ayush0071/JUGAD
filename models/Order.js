const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    software: { type: mongoose.Schema.Types.ObjectId, ref: 'Software', required: true },
    amount: { type: Number, required: true }, // paise
    couponCode: { type: String, default: null },
    paymentMethod: { type: String, enum: ['gpay', 'phonepe', 'paytm', 'upi', 'card', 'netbanking'], required: true },
    status: { type: String, enum: ['pending', 'paid', 'rejected'], default: 'pending' },
    verification: { type: String, enum: ['self-reported', 'admin-verified', 'simulated'], default: 'self-reported' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
