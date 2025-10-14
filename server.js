const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const app = express();



// db * router 불러오기
const db = require('./config/db');


/* 미들웨어 설정 부분 */
app.use(cookieParser());
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'vitamind_secret_key',
  resave: false,
  saveUninitialized: false,  // false로 바꿔야 안정적
  cookie: {
    httpOnly: true,          // JS에서 접근 못 하게
    maxAge: 1000 * 60 * 60,  // 1시간
    secure: false            // 개발 환경 (HTTPS 아님)이므로 false
  }
}));

// 라우터 등록
const pageRouter = require('./routes/pageRouter');
const dbRouter = require('./routes/dbRouter');

/* 라우터 연결 부분 */
app.use('/', pageRouter);
app.use('/db', dbRouter);

// 서버 실행
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ VitaMind 웹 앱이 http://localhost:${PORT} 에서 실행 중입니다.`);
});