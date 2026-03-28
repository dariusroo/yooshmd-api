require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const officesRoutes = require('./routes/offices');
const doctorsRoutes = require('./routes/doctors');
const appointmentsRoutes = require('./routes/appointments');
const patientsRoutes = require('./routes/patients');
const slotsRoutes = require('./routes/slots');
const cronRoutes = require('./routes/cron');

const app = express();
const PORT = process.env.PORT || 3000;

// ── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'https://dariusroo.github.io',
  'https://book.yooshmd.com',
  // Add other allowed origins here if needed
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/offices', officesRoutes);
app.use('/api/doctors', doctorsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/patients', patientsRoutes);

// Slot availability
app.use('/api/slots', slotsRoutes);

// Cron jobs
app.use('/api/cron', cronRoutes);

// Convenience direct routes for profiles and templates
app.use('/api/appointment_profiles', (req, res, next) => {
  req.url = '/profiles' + req.url.replace(/^\/?/, '/').replace('//', '/');
  slotsRoutes(req, res, next);
});
app.use('/api/appointment_templates', (req, res, next) => {
  req.url = '/templates' + req.url.replace(/^\/?/, '/').replace('//', '/');
  slotsRoutes(req, res, next);
});

// ── Health check ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

// Local dev only — Vercel handles listen() in production
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`yooshmd-api running on http://localhost:${PORT}`);
    console.log('');
    console.log('Quick start:');
    console.log(`  1. Copy .env.example → .env and fill in CLIENT_ID / CLIENT_SECRET`);
    console.log(`  2. Open http://localhost:${PORT}/api/auth/login in your browser`);
    console.log(`  3. Complete OAuth — tokens auto-saved to .env`);
    console.log(`  4. Hit http://localhost:${PORT}/api/doctors to verify`);
  });
}

module.exports = app;
