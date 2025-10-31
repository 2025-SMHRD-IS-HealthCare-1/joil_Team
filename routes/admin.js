// src/routes/admin.js
const express = require('express');
const router = express.Router();
const pool = require('../db/pool'); // mysql2/promise pool

// 관리자만 접근 허용
function needAdmin(req, res, next) {
  try {
    const u = req.session.user;
    if (!u) return res.redirect('/login');
    if (String(u.admin_yn).toUpperCase() !== 'Y') return res.redirect('/me');
    next();
  } catch (e) {
    next(e);
  }
}

// 쿼리를 안전하게 실행: 실패해도 기본값 반환
async function safeQuery(label, sql, params = [], fallbackRows = []) {
  try {
    const [rows] = await pool.query(sql, params);
    return rows;
  } catch (err) {
    console.error(`[admin][${label}] SQL FAIL:`, err && err.code, err && err.sqlMessage);
    return fallbackRows;
  }
}

// 모든 통계 가져오기
async function fetchAdminStats() {
  const totalMembersRows = await safeQuery(
    'total_members',
    `SELECT COUNT(*) AS total_members FROM TB_MEMBER`,
    [],
    [{ total_members: 0 }]
  );

  const todaySignupRows = await safeQuery(
    'today_signup',
    `SELECT COUNT(*) AS today_signup
       FROM TB_MEMBER
      WHERE DATE(join_date) = CURDATE()`,
    [],
    [{ today_signup: 0 }]
  );

  // today_activity: 오늘 생성된 친구행 수
const todayActivityRows = await safeQuery(
  'today_activity',
  `SELECT COUNT(*) AS today_activity
     FROM TB_FRIEND
    WHERE DATE(created_at) = CURDATE()`,
  [],
  [{ today_activity: 0 }]
);

  const reqStatusRows = await safeQuery(
    'req_status',
    `SELECT req_status, COUNT(*) AS count
       FROM TB_REQUEST
      GROUP BY req_status`,
    [],
    [] // 없으면 빈배열
  );

  const recentMemberRows = await safeQuery(
    'recent_members',
    `SELECT id, name, phone, join_date
       FROM TB_MEMBER
   ORDER BY join_date DESC
      LIMIT 6`,
    [],
    []
  );

  // activity7: 최근 7일 일별 친구행 수
const actDailyRows = await safeQuery(
  'activity7',
  `SELECT DATE(created_at) AS d, COUNT(*) AS c
     FROM TB_FRIEND
    WHERE created_at >= CURDATE() - INTERVAL 6 DAY
 GROUP BY DATE(created_at)
 ORDER BY d`,
  [],
  []
);

  const signDailyRows = await safeQuery(
    'signup7',
    `SELECT DATE(join_date) AS d, COUNT(*) AS c
       FROM TB_MEMBER
      WHERE join_date >= CURDATE() - INTERVAL 6 DAY
   GROUP BY DATE(join_date)
   ORDER BY d`,
    [],
    []
  );

  // 상태 카운트 집계
  const statusMap = { WAIT: 0, ACCEPT: 0, DONE: 0 };
  reqStatusRows.forEach((r) => {
    const k = String(r.req_status || '').toUpperCase();
    if (statusMap[k] !== undefined) statusMap[k] = Number(r.count || 0);
  });

  // 최근 7일 라벨 생성
  const labels = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const toSeries = (rows) => {
    const map = new Map(rows.map((r) => [String(r.d), Number(r.c)]));
    return labels.map((k) => map.get(k) || 0);
  };

  return {
    cards: {
      total_members: Number((totalMembersRows[0] && totalMembersRows[0].total_members) || 0),
      today_signup: Number((todaySignupRows[0] && todaySignupRows[0].today_signup) || 0),
      today_activity: Number((todayActivityRows[0] && todayActivityRows[0].today_activity) || 0),
      open_match: Number(statusMap.WAIT + statusMap.ACCEPT),
    },
    recentMembers: recentMemberRows,
    charts: {
      labels,
      activity7: toSeries(actDailyRows),
      signup7: toSeries(signDailyRows),
      status: {
        wait: statusMap.WAIT,
        accept: statusMap.ACCEPT,
        done: statusMap.DONE,
      },
    },
  };
}

// 화면
router.get('/', needAdmin, async (req, res, next) => {
  try {
    const stats = await fetchAdminStats();
    res.render('admin', { user: req.session.user, stats });
  } catch (err) {
    next(err);
  }
});

// JSON (자동 새로고침용)
router.get('/data', needAdmin, async (req, res, next) => {
  try {
    const stats = await fetchAdminStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
