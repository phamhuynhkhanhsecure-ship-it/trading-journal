import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './db.js';
import tradesRouter from './routes/trades.js';
import rulesRouter from './routes/rules.js';
import journalRouter from './routes/journal.js';
import tagsRouter from './routes/tags.js';
import playbooksRouter from './routes/playbooks.js';
import analyticsRouter from './routes/analytics.js';
import aiRouter from './routes/ai.js';
import { requireAuth } from './middleware/authMiddleware.js';
import { errorHandler } from './middleware/errorHandler.js';
import { storageProvider } from './composition/container.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve uploaded images as static files (backward compatibility for legacy local images)
const uploadsDir = path.join(__dirname, '..', '..', 'data', 'uploads');
app.use('/uploads', express.static(uploadsDir));

// Google Drive image proxy endpoint
app.get('/api/images/:driveFileId', async (req, res) => {
  try {
    const { driveFileId } = req.params;
    if (!driveFileId || !storageProvider.isConfigured()) {
      res.status(404).json({ success: false, error: 'Image not found' });
      return;
    }

    const { stream, mimeType } = await storageProvider.getStream(driveFileId);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // cache 1 hour
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    stream.pipe(res);
  } catch (error: any) {
    console.error('Image proxy error:', error?.message || error);
    if (error?.code === 404) {
      res.status(404).json({ success: false, error: 'Image not found on Google Drive' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to fetch image' });
    }
  }
});

// API routes (all protected by auth middleware)
app.use('/api/trades', requireAuth, tradesRouter);
app.use('/api/rules', requireAuth, rulesRouter);
app.use('/api/journal', requireAuth, journalRouter);
app.use('/api/tags', requireAuth, tagsRouter);
app.use('/api/playbooks', requireAuth, playbooksRouter);
app.use('/api/analytics', requireAuth, analyticsRouter);
app.use('/api/ai', requireAuth, aiRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Heartbeat auto-shutdown ---
// If no heartbeat from browser for 15s, server shuts down automatically
let heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
const HEARTBEAT_TIMEOUT = 65_000; // 65 seconds (to avoid background tab throttling)

function resetHeartbeat() {
  if (heartbeatTimer) clearTimeout(heartbeatTimer);
  heartbeatTimer = setTimeout(() => {
    console.log('💔 No heartbeat received — browser closed. Shutting down...');
    process.exit(0);
  }, HEARTBEAT_TIMEOUT);
}

app.get('/api/heartbeat', (_req, res) => {
  resetHeartbeat();
  res.json({ status: 'alive' });
});

// ===== Global Error Handler (MUST be registered LAST) =====
app.use(errorHandler);

// Connect to MongoDB then start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Trading Journal Server running on http://localhost:${PORT}`);
    // Start heartbeat timer after server is ready
    resetHeartbeat();
  });
});
