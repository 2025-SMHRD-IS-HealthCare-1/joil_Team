// src/routes/auth.js
const express = require('express');
const router = express.Router();

// 로그인 페이지
router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('login', { title: '로그인' });
});

// 로그인 처리 (데모용: admin01 = 관리자, 그 외는 일반)
router.post('/login', (req, res) => {
  const { id, pw } = req.body;
  if (!id || !pw) return res.status(400).send('id/pw 필요');

  const isAdmin = id === 'admin01';
  req.session.user = {
    id,
    name: isAdmin ? '관리자' : '회원',
    admin_yn: isAdmin ? 'Y' : 'N',
  };
  res.redirect('/');
});

// 로그아웃
router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router; // ★중요
