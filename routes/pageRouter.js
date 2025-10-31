const express = require("express");
const router = express.Router();
const path = require("path");

const publicDir = path.join(__dirname, '..', 'public');

// ✅ 로그인 체크 미들웨어
function isLoggedIn(req, res, next) {
  if (!req.session.user) {
    return res.send(`
      <script>
        alert('로그인 정보가 없습니다. 다시 로그인해주세요.');
        window.location.href = '/';
      </script>
    `);
  }
  next();
}

const { redirectAdminFromMe } = require('../middlewares/guards'); // 공용 미들웨어 사용 :contentReference[oaicite:21]{index=21}

// 메인 페이지
router.get('/', redirectAdminFromMe, (req, res) => {
  res.sendFile(path.join(publicDir, 'main.html'));
});
router.get('/1', (req, res) => {
  res.sendFile(path.join(publicDir, '1.html'));
});

router.get('/알림.html', (req, res) => {
  res.sendFile(path.join(publicDir, '알림.html'));
});

router.get('/project', isLoggedIn, (req, res) => {
  res.sendFile(path.join(publicDir, 'project.html'));
});

router.get('/register', (req, res) => {
  res.sendFile(path.join(publicDir, 'register.html'));
});

router.get('/update', (req, res) => {
  res.sendFile(path.join(publicDir, "update.html"));
});

router.get('/delete', (req, res) => {
  res.sendFile(path.join(publicDir, "delete.html"));
});

module.exports = router;