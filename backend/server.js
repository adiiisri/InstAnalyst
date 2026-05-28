import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './db.js';
import apiRouter from './routes/api.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for all origins (supports both local development and live production URLs)
app.use(cors());

app.use(express.json());

// Main API Route
app.use('/api', apiRouter);

// Base route for sanity check
app.get('/', (req, res) => {
  res.json({ message: 'InstAnalyst Mock API running. Access via /api/status, /api/download, /api/analytics/summary.' });
});

// Start Server after attempting DB connection
const startServer = async () => {
  console.log('[System] Initializing server...');
  await connectDB();
  
  app.listen(PORT, () => {
    console.log(`[System] InstAnalyst backend server online on http://localhost:${PORT}`);
  });
};

startServer();
