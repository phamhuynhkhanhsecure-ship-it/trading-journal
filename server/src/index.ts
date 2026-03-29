import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import tradesRouter from './routes/trades.js';
import rulesRouter from './routes/rules.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve uploaded images as static files
const uploadsDir = path.join(__dirname, '..', '..', 'data', 'uploads');
app.use('/uploads', express.static(uploadsDir));

// API routes
app.use('/api/trades', tradesRouter);
app.use('/api/rules', rulesRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Trading Journal Server running on http://localhost:${PORT}`);
});
