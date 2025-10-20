// server.js
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const os = require('os');

const app = express();

// === 네트워크 인터페이스에서 로컬 IPv4 주소 찾기 ===
function getLocalIPv4() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}
const localIP = getLocalIPv4();

// db * router 불러오기
const db = require('./config/db');

// (프로덕션에서 프록시/ngrok 같은 앞단을 쓸 경우) 프록시 신뢰 설정
// 만약 ngrok 같은 https 리버스 프록시를 사용하면 이 줄을 활성화하세요.
// app.set('trust proxy', 1);

// 미들웨어 설정 부분
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 세션 설정: production 환경이면 secure 옵션을 true로 바꾸는 예시
const isProd = process.env.NODE_ENV === 'production';
app.use(session({
  secret: 'vitamind_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60, // 1시간
    secure: false // 개발 환경은 false (https가 아닐 때)
    // 만약 https/ngrok 사용 시 secure: true 로 변경 고려
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

// 서버를 모든 네트워크 인터페이스에 바인드 (다른 장치에서 접근 가능)
app.listen(PORT, '0.0.0.0', () => {
  console.log('✅ VitaMind 웹 앱 실행 중');
  console.log(`- 로컬 (서버 머신) 접속: http://localhost:${PORT}`);
  console.log(`- 같은 네트워크(다른 PC/폰)에서 접속: http://${localIP}:${PORT}`);
  console.log('  → 다른 장치의 브라우저에 위 주소를 입력하세요.');
});