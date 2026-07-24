const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/jugad';

  try {
    const conn = await mongoose.connect(mongoUri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`MongoDB connected: ${conn.connection.host}`);
    return;
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
  }

  if (process.env.NODE_ENV === 'production') {
    console.error('MongoDB is required in production. Set MONGO_URI or start MongoDB.');
    process.exit(1);
  }

  try {
    console.log('Falling back to an in-memory MongoDB instance for local development.');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const memoryServer = await MongoMemoryServer.create();
    const memoryUri = memoryServer.getUri();
    const conn = await mongoose.connect(memoryUri, {
      autoIndex: true,
    });
    console.log(`In-memory MongoDB connected: ${conn.connection.host}`);
  } catch (fallbackErr) {
    console.error(`In-memory MongoDB fallback failed: ${fallbackErr.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
