require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');

connectDB();

const app = express();

app.use(helmet({ contentSecurityPolicy: false })); // CSP off by default since we serve our own inline-script-free static frontend; enable/tune if you add third-party embeds
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false });
app.use('/api', globalLimiter);

// Uploaded files (cover images, QR codes, developer photos — installers are gated through the download controller, not served statically)
app.use('/uploads/covers', express.static(path.join(__dirname, 'uploads/covers')));
app.use('/uploads/qr', express.static(path.join(__dirname, 'uploads/qr')));
app.use('/uploads/developers', express.static(path.join(__dirname, 'uploads/developers')));

// ---- API routes ----
app.get('/api/health', (req, res) => res.json({ success: true, message: 'JUGAD API is running' }));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/software', require('./routes/softwareRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/developers', require('./routes/developerRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/subscribe', require('./routes/subscribeRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

app.use('/api', notFound);
app.use('/api', errorHandler);

// ---- Serve the JUGAD static frontend ----
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`JUGAD server running on port ${PORT} [${process.env.NODE_ENV}]`));

process.on('unhandledRejection', (err) => console.error('UNHANDLED REJECTION:', err.message));
