import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let isConnected = false;

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/instanalyst', {
      serverSelectionTimeoutMS: 2000 // Quick timeout to fallback if Mongo isn't running
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    isConnected = true;
    return true;
  } catch (error) {
    console.warn(`[Database Warning] Could not connect to MongoDB: ${error.message}`);
    console.warn(`[Database Info] Backend is running in resilient MOCK DB MODE. All functionalities will continue working in-memory.`);
    isConnected = false;
    return false;
  }
};

export const getDbStatus = () => {
  return isConnected ? 'CONNECTED' : 'MOCK_MODE_ACTIVE';
};
