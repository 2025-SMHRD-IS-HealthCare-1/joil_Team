// src/routes/dashboard.js
const express = require('express');
const router = express.Router();

router.get('/me', (req, res) => {
  const u = req.session.user;
  // 간단한 개인 대시보드
  res.render('me', { title: '내 대시보드', user: u });
});

module.exports = router; // ★중요
