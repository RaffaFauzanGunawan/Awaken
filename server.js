require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const authRoutes = require('./src/routes/auth');
const hunterRoutes = require('./src/routes/hunters');
const gateRoutes = require('./src/routes/gate');
const battleRoutes = require('./src/routes/battles');
const leaderboardRoutes = require('./src/routes/leaderboard');
const oddsRoutes = require('./src/routes/odds');
const inventoryRoutes = require('./src/routes/inventory');
const shopRoutes = require('./src/routes/shop');
const petsRoutes = require('./src/routes/pets');
const gachaRoutes = require('./src/routes/gacha');
const migrate = require('./src/migrate');

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Matikan ETag & cache untuk semua API route supaya tidak dapat 304
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.removeHeader('ETag');
  next();
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/hunters', hunterRoutes);
app.use('/api/gate', gateRoutes);
app.use('/api/battles', battleRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/odds', oddsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/pets', petsRoutes);
app.use('/api/gacha', gachaRoutes);

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint tidak ditemukan.' });
  }
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
});

const PORT = process.env.PORT || 3000;
migrate().then(() => {
  console.log('✅ Database migration selesai.');
  app.listen(PORT, () => {
    console.log(`⚡ Gerbang Awakening berjalan di http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('⚠️ Migration error (server tetap jalan):', err.message);
  app.listen(PORT, () => {
    console.log(`⚡ Gerbang Awakening berjalan di http://localhost:${PORT} (tanpa migration)`);
  });
});
