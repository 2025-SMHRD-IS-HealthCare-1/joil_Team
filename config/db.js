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

// ✅ 민감정보 마스킹 로그
console.log('[DB] config =', {
  host: cfg.host,
  port: cfg.port,
  user: cfg.user,
  database: cfg.database,
  passwordLen: cfg.password ? cfg.password.length : 0,
});

const db = mysql.createPool(cfg);

// ✅ 연결 확인 함수
async function checkDbConnection() {
  try {
    const connection = await db.getConnection();
    const [[{ db: dbName }]] = await connection.query('SELECT DATABASE() AS db');
    console.log(`✅ [DB] Connection success. database=${dbName}`);
    connection.release();
  } catch (err) {
    console.error(`❌ [DB] Connection failed: ${err.message}`);
  }
}

// 앱 시작 시 1회 검사
checkDbConnection();

module.exports = db;

/* 
    DB 연결
    1. mysql2 라이브러리 사용
     - node.js에서 MySQL과 통신하기 위해서 사용되는 드라이버 라이브러리
     - mysql 라이브러리는 과거에 썼고, 더이상은 사용되지 않는다!
     - 연결 방식이 크게 2가지가 존재 (콜백 방식, async/await 방식)

    2. createPool
     - 연결에는 단일 연결(createConnection) 다중 연결(createPool) 존재
     - Pool은 여러 개의 DB연결을 미리 만들어두고, 요청이 들어올 때마다 빌려쓰고 반환한다.
     - 장점
       1) 매번 새로운 연결을 생성/해제하는 비용 감소 (성능 향상)
       2) 동시에 여러 요청 처리 가능 (동시성 보장)
       3) 연결이 끊어지는 경우, 자동 재사용 가능 (안정성 ↑)

    3. 연결 확인
     - getConnection으로 DB가 접속 가능한지 여부 확인
     - 성공한 경우, 반드시 release를 통해 반환 필요

    4. module.exports = db;
     - 최종적으로 설정이 완료되면, pool을 바깥으로 수출!
*/