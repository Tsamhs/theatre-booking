require('dotenv').config();

const express      = require('express');
const cors         = require('cors');
const { testConnection } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const authRoutes        = require('./routes/auth');
const theatreRoutes     = require('./routes/theatres');
const showRoutes        = require('./routes/shows');
const reservationRoutes = require('./routes/reservations');
const userRoutes        = require('./routes/users');

const app = express();

// ── Global middleware ────────────────────────────────────────────
// origin: true mirrors the request Origin back — allows any localhost
// port (8081, 19006, 3000…) without an exhaustive whitelist.
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────────
app.use('/api/auth',         authRoutes);
app.use('/api/theatres',     theatreRoutes);
app.use('/api/shows',        showRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/user',         userRoutes);

// Health check — useful for Postman smoke tests
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 — unknown routes
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Central error handler (must be registered last)
app.use(errorHandler);

// ── Bootstrap ───────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

async function start() {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

start();
