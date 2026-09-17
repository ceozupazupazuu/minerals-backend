const express = require('express');
const bcrypt = require('bcryptjs');

const router = express.Router();

router.get('/login', (req, res) => {
  if (req.session && req.session.isAdmin) return res.redirect('/');
  res.render('login', { error: null });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const adminUser = process.env.ADMIN_USER;
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!adminUser || !adminPasswordHash) {
    return res.render('login', {
      error: 'Server belum dikonfigurasi (ADMIN_USER / ADMIN_PASSWORD_HASH belum diset).',
    });
  }

  const validUser = username === adminUser;
  const validPass = validUser && (await bcrypt.compare(password, adminPasswordHash));

  if (validUser && validPass) {
    req.session.isAdmin = true;
    return res.redirect('/');
  }

  res.render('login', { error: 'Username atau password salah.' });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
