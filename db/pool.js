// src/db/pool.js
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

// ✅ 환경변수 우선, 없으면 기본값 사용
const cfg = {
  host: process.env.DB_HOST || "project-db-campus.smhrd.com",
  port: Number(process.env.DB_PORT) || 3308,
  user: process.env.DB_USER || "campus_25IS_health1_p2_1",
  password: process.env.DB_PASSWORD || "smhrd1",
  database: process.env.DB_NAME || "campus_25IS_health1_p2_1",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// 마스킹 출력 (비밀번호는 길이만 표시)
console.log('[DB] config =', {
  host: cfg.host,
  port: cfg.port,
  user: cfg.user,
  database: cfg.database,
  passwordLen: cfg.password ? cfg.password.length : 0,
});

const pool = mysql.createPool(cfg);

// 앱 시작 시 1회 연결 확인
(async () => {
  try {
    const conn = await pool.getConnection();
    const [[{ db }]] = await conn.query('SELECT DATABASE() AS db');
    console.log(`✅ [DB] Connected. database=${db}`);
    conn.release();
  } catch (e) {
    console.error('❌ [DB] Connection check failed:', e.message);
  }
})();

module.exports = pool;
