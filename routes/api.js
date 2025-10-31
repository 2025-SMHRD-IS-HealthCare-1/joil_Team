// src/routes/api.js
const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// yyyy-mm-dd (로컬) 만들기
function ymdLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// mysql DATE 컬럼 값을 yyyy-mm-dd로 변환 (Date 또는 문자열 모두 대응)
function ymdFromSql(val) {
  if (val instanceof Date) return ymdLocal(val);
  const s = String(val);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

// 최근 n일 라벨(오늘 포함), 로컬 00:00 기준
function lastNDates(n) {
  const out = [];
  const today0 = new Date();
  today0.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today0);
    d.setDate(today0.getDate() - i);
    out.push(ymdLocal(d));
  }
  return out;
}

// ───────────────────────────────────────────
// 최근 7일 가입 추이 (트리거 없이 코드로만 집계)
// GET /api/stats/joins7d
router.get('/stats/joins7d', async (req, res) => {
  // 컬럼 추정: join_date / created_at / reg_date 중 존재값
  const dateExpr = "DATE(COALESCE(join_date, created_at, reg_date))";
  try {
    const [rows] = await pool.query(
      `
      SELECT ${dateExpr} AS d, COUNT(*) AS cnt
        FROM TB_MEMBER
       WHERE ${dateExpr} >= CURDATE() - INTERVAL 6 DAY
       GROUP BY ${dateExpr}
       ORDER BY d ASC
      `
    );

    const labels = lastNDates(7);  // 로컬 라벨
    const map = Object.create(null);
    for (const r of rows) {
      const k = ymdFromSql(r.d);   // mysql 결과를 yyyy-mm-dd로 통일
      map[k] = Number(r.cnt) || 0;
    }
    const data = labels.map(d => map[d] ?? 0);

    res.json({ ok: true, labels, data });
  } catch (e) {
    console.error('[api][joins7d] fail:', e && e.message);
    res.status(500).json({ ok: false, error: String(e && e.message) });
  }
});

// ───────────────────────────────────────────
// 헬스/스모크
router.get('/ping', (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

router.get('/stats/smoke', async (req, res) => {
  try {
    const [[m]] = await pool.query('SELECT COUNT(*) AS cnt FROM TB_MEMBER');
    res.json({ ok: true, member_count: m.cnt });
  } catch (e) {
    console.error('[api][smoke] fail:', e);
    res.status(500).json({ ok: false, error: String(e && e.message) });
  }
});

// ───────────────────────────────────────────
// 상단 카드
router.get('/stats/cards', async (req, res) => {
  try {
    const [[a]] = await pool.query('SELECT COUNT(*) AS c FROM TB_MEMBER');
    const [[b]] = await pool.query("SELECT COUNT(*) AS c FROM TB_MEMBER WHERE DATE(join_date)=CURDATE()");
    const [[c]] = await pool.query("SELECT COUNT(*) AS c FROM TB_ACTIVITY WHERE DATE(act_date)=CURDATE()");
    const [[d]] = await pool.query("SELECT COUNT(*) AS c FROM TB_MATCH WHERE status='OPEN'");
    res.json({
      ok: true,
      totalMembers: a.c || 0,
      todayJoins: b.c || 0,
      todayActivities: c.c || 0,
      openMatches: d.c || 0
    });
  } catch (e) {
    console.error('[api][cards]', e);
    res.status(500).json({ ok:false, error:String(e && e.message) });
  }
});

// 최근 가입 6명
router.get('/members/recent', async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 6), 50);
  try {
    const [rows] = await pool.query(
      'SELECT id, name, phone, join_date FROM TB_MEMBER ORDER BY join_date DESC LIMIT ?',
      [limit]
    );
    res.json({ ok:true, rows });
  } catch (e) {
    console.error('[api][recent]', e);
    res.status(500).json({ ok:false, error:String(e && e.message) });
  }
});

// 헬스체크
router.get('/health', (req, res) => {
  res.json({ ok: true, t: Date.now() });
});

// 디버그: 현재 DB/카운트
router.get('/debug/db', async (req, res) => {
  try {
    const [[{ db }]] = await pool.query('SELECT DATABASE() AS db');
    const [[{ members }]] = await pool.query('SELECT COUNT(*) AS members FROM TB_MEMBER');
    res.json({ db, members });
  } catch (e) {
    console.error('[api/debug/db]', e);
    res.status(500).json({ error: String(e) });
  }
});

// ───────────────────────────────────────────
// 관리자 대시보드 기타 엔드포인트
router.get('/admin/summary', async (req, res) => {
  try {
    const [[{ total_members }]] = await pool.query(
      'SELECT COUNT(*) AS total_members FROM TB_MEMBER'
    );
    const [[{ today_signup }]] = await pool.query(
      "SELECT COUNT(*) AS today_signup FROM TB_MEMBER WHERE DATE(join_date)=CURDATE()"
    );
    const [[{ today_activity }]] = await pool.query(
  "SELECT COUNT(*) AS today_activity FROM TB_FRIEND WHERE DATE(created_at)=CURDATE()"
);
    const [[{ open_match }]] = await pool.query(
      "SELECT COUNT(*) AS open_match FROM TB_REQUEST WHERE req_status IN ('WAIT','ACCEPT')"
    );
    const [statuses] = await pool.query(
      "SELECT req_status, COUNT(*) AS cnt FROM TB_REQUEST GROUP BY req_status"
    );
    res.json({ total_members, today_signup, today_activity, open_match, statuses });
  } catch (e) {
    console.error('[api/admin/summary]', e);
    res.status(500).json({ error: String(e) });
  }
});

router.get('/admin/recent-joins', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, phone, join_date
         FROM TB_MEMBER
        ORDER BY join_date DESC
        LIMIT 6`
    );
    res.json(rows);
  } catch (e) {
    console.error('[api/admin/recent-joins]', e);
    res.status(500).json({ error: String(e) });
  }
});

router.get('/admin/daily-signup', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT DATE(join_date) AS d, COUNT(*) AS c
         FROM TB_MEMBER
        WHERE join_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
        GROUP BY DATE(join_date)`
    );
  // yyyy-mm-dd로 보정
    const fixed = rows.map(r => ({ d: ymdFromSql(r.d), c: Number(r.c) || 0 }));
    res.json(fixed);
  } catch (e) {
    console.error('[api/admin/daily-signup]', e);
    res.status(500).json({ error: String(e) });
  }
});

router.get('/admin/daily-activity', async (req, res) => {
  try {
    const [rows] = await pool.query(
  `SELECT DATE(created_at) AS d, COUNT(*) AS c
     FROM TB_FRIEND
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
    GROUP BY DATE(created_at)`
);
    const fixed = rows.map(r => ({ d: ymdFromSql(r.d), c: Number(r.c) || 0 }));
    res.json(fixed);
  } catch (e) {
    console.error('[api/admin/daily-activity]', e);
    res.status(500).json({ error: String(e) });
  }
});

module.exports = router;
