const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const AVATAR_MAX_CHARS = 350000; // ~250KB setelah decode base64, cukup untuk foto 160x160 JPEG

function signToken(user) {
  return jwt.sign({ uid: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !USERNAME_RE.test(username)) {
      return res.status(400).json({ error: 'Username 3-20 karakter, hanya huruf/angka/underscore.' });
    }
    if (!password || String(password).length < 6) {
      return res.status(400).json({ error: 'Password minimal 6 karakter.' });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Username sudah dipakai Pemburu lain.' });
    }

    const hash = await bcrypt.hash(String(password), 10);
    const [result] = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)',
      [username, hash]
    );

    const user = { id: result.insertId, username };
    const token = signToken(user);
    res.status(201).json({ token, username: user.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mendaftarkan Pemburu.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi.' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Username atau password salah.' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(String(password), user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Username atau password salah.' });
    }

    const token = signToken(user);
    res.json({ token, username: user.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal masuk.' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, username, avatar, created_at FROM users WHERE id = ?', [req.userId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memuat data pengguna.' });
  }
});

router.put('/avatar', requireAuth, async (req, res) => {
  try {
    const { avatar } = req.body || {};

    if (avatar === null) {
      await pool.query('UPDATE users SET avatar = NULL WHERE id = ?', [req.userId]);
      return res.json({ avatar: null });
    }

    if (typeof avatar !== 'string' || !/^data:image\/(png|jpe?g|webp);base64,/.test(avatar)) {
      return res.status(400).json({ error: 'Format foto tidak dikenal. Gunakan PNG, JPEG, atau WebP.' });
    }
    if (avatar.length > AVATAR_MAX_CHARS) {
      return res.status(400).json({ error: 'Ukuran foto terlalu besar. Coba foto lain atau perkecil dulu.' });
    }

    await pool.query('UPDATE users SET avatar = ? WHERE id = ?', [avatar, req.userId]);
    res.json({ avatar });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menyimpan foto profil.' });
  }
});

module.exports = router;
