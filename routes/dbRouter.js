const express = require('express');
const router = express.Router();
const db = require('../config/db');
const path = require("path");

// 회원가입
router.post('/register', async (req, res) => {
  const { name, age, id, pw, phone, latitude, longitude, hobby, profile_text } = req.body;

  const sql = `
    INSERT INTO TB_MEMBER
      (name, age, id, pw, phone, latitude, longitude, hobby, profile_text)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const params = [name, age, id, pw, phone, latitude, longitude, hobby, profile_text];

  try {
    const [result] = await db.execute(sql, params);
    if (result.affectedRows > 0) {
      res.redirect("/");
    } else {
      res.redirect('/register');
    }
  } catch (err) {
    console.error("DB 오류:", err);
    res.status(500).send("서버 오류가 발생했습니다.");
  }
});

// 로그인
router.post("/login", async (req, res) => {
  const { id, pw } = req.body;

  try {
    const [rows] = await db.execute(`
      SELECT *
      FROM TB_MEMBER
      WHERE id = ? AND pw = ?`,
      [id, pw]);

    if (rows.length > 0) {
      req.session.user = { id: rows[0].id, name: rows[0].name };

      res.cookie("userId", rows[0].id, { httpOnly: false, maxAge: 1000 * 60 * 60 });
      console.log("✅ 로그인 성공:", req.session.user);
      return res.status(200).send({ success: true });
    } else {
      return res.status(401).send({ success: false, message: "로그인 실패" });
    }
  } catch (err) {
    console.error("DB 오류:", err);
    return res.status(500).send({ success: false, message: "서버 오류" });
  }
});

// 친구 목록 조회
router.get('/getFriends', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ success: false, message: "로그인 필요" });

  const userId = req.session.user.id;

  try {
    // 내 id_num 가져오기
    const [[me]] = await db.execute("SELECT id_num FROM TB_MEMBER WHERE id = ?", [userId]);
    if (!me) return res.status(404).json({ success: false, message: "회원 정보 없음" });

    const [friends] = await db.execute(`
      SELECT m.id, m.name, m.hobby, m.phone, m.profile_text
      FROM TB_FRIEND f
      JOIN TB_MEMBER m ON f.friend_id_num = m.id_num
      WHERE f.user_id_num = ?
    `, [me.id_num]);

    res.json({ success: true, friends });
  } catch (err) {
    console.error("친구 목록 조회 오류:", err);
    res.status(500).json({ success: false, message: "친구 목록 조회 실패" });
  }
});


// 친구 요청 보내기 (기존 addFriend 대신 사용)
router.post('/addFriend', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ success: false, message: "로그인 필요" });
  
  const from_id = req.session.user.id;
  const { friendId: to_id } = req.body;

  try {
    await db.execute(
      "INSERT INTO TB_FRIEND_REQUEST (from_id, to_id) VALUES (?, ?)",
      [from_id, to_id]
    );
    res.json({ success: true, message: "친구 요청 전송 완료" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      res.status(400).json({ success: false, message: "이미 요청을 보냈습니다." });
    } else {
      console.error(err);
      res.status(500).json({ success: false, message: "서버 오류" });
    }
  }
});

// 로그아웃
router.post('/logout', async (req, res) => {
  if (!req.session.user) return res.send({ success: true, message: "이미 로그아웃되었습니다." });

  req.session.destroy(err => {
    if (err) {
      console.error("세션 파괴 오류:", err);
      return res.status(500).send({ success: false, message: "로그아웃 중 서버 오류" });
    }
    res.clearCookie("userId");
    console.log("✅ 로그아웃 성공");
    res.send({ success: true });
  });
});

// 회원정보 수정
router.post("/update", async (req, res) => {
  const { id, pw, nick } = req.body;
  const sql = "UPDATE TB_MEMBER SET nick = ? WHERE id = ? AND pw = ?";
  const params = [nick, id, pw];

  try {
    const [result] = await db.execute(sql, params);
    if (result.affectedRows > 0) {
      res.sendFile(path.join(__dirname, "../public/registerSuc.html"));
    } else {
      res.redirect("/update");
    }
  } catch (err) {
    console.error("회원 정보 수정 오류:", err);
    res.status(500).send("서버 오류");
  }
});

// 회원 탈퇴
router.post("/delete", async (req, res) => {
  const { id, pw } = req.body;
  const sql = "DELETE FROM TB_MEMBER WHERE id = ? AND pw = ?";
  const params = [id, pw];

  try {
    const [result] = await db.execute(sql, params);
    if (result.affectedRows > 0) {
      res.sendFile(path.join(__dirname, "../public/deleteSuc.html"));
    } else {
      res.redirect("/delete");
    }
  } catch (err) {
    console.error("회원 탈퇴 오류:", err);
    res.status(500).send("서버 오류");
  }
});

// 위치 업데이트
router.post('/updateLocation', async (req, res) => {
  if (!req.session.user) return res.status(401).send({ success: false, message: "로그인 필요" });

  const id = req.session.user.id;
  const latitude = parseFloat(req.body.latitude);
  const longitude = parseFloat(req.body.longitude);

  if (isNaN(latitude) || isNaN(longitude)) return res.status(400).send({ success: false, message: "위도/경도 값이 숫자여야 합니다." });

  try {
    const [result] = await db.execute("UPDATE TB_MEMBER SET latitude = ?, longitude = ? WHERE id = ?", [latitude, longitude, id]);
    res.send({ success: true, affectedRows: result.affectedRows });
  } catch (err) {
    console.error("위치 업데이트 오류:", err);
    res.status(500).send({ success: false, message: "서버 오류" });
  }
});

// 반경 10km 내 사용자 조회
router.post('/nearby', async (req, res) => {
  if (!req.session.user) return res.status(401).send({ success: false, message: "로그인 필요" });

  const userId = req.session.user.id;
  const latitude = parseFloat(req.body.latitude);
  const longitude = parseFloat(req.body.longitude);

  if (isNaN(latitude) || isNaN(longitude))
    return res.status(400).send({ success: false, message: "위도/경도 값이 숫자여야 합니다." });

  try {
    // 1️⃣ 현재 로그인한 사용자의 id_num 가져오기
    const [[me]] = await db.execute("SELECT id_num FROM TB_MEMBER WHERE id = ?", [userId]);
    if (!me) return res.status(404).send({ success: false, message: "회원 정보를 찾을 수 없습니다." });

    // 2️⃣ 근처 사용자 중 친구/본인 제외
    const sql = `
      SELECT m.id, m.name, m.phone, m.hobby, m.profile_text, m.latitude, m.longitude,
        (6371 * ACOS(
          COS(RADIANS(?)) * COS(RADIANS(m.latitude)) * COS(RADIANS(m.longitude) - RADIANS(?))
          + SIN(RADIANS(?)) * SIN(RADIANS(m.latitude))
        )) AS distance
      FROM TB_MEMBER m
      WHERE 
        m.latitude IS NOT NULL
        AND m.longitude IS NOT NULL
        AND m.id_num <> ? -- 자기 자신 제외
        AND m.id_num NOT IN (  -- 이미 친구인 사람 제외
          SELECT f.friend_id_num
          FROM TB_FRIEND f
          WHERE f.user_id_num = ?
        )
      HAVING distance <= 10
      ORDER BY distance ASC;
    `;

    const [rows] = await db.execute(sql, [latitude, longitude, latitude, me.id_num, me.id_num]);
    res.send({ success: true, data: rows });

  } catch (err) {
    console.error("근처 사용자 조회 오류:", err);
    res.status(500).send({ success: false, message: "서버 오류" });
  }
});

// ======================
// 🛒 근처 장보기/시장 조회 라우터
// ======================
router.post('/nearbyMarkets', async (req, res) => {
  if (!req.session.user) return res.status(401).send({ success: false, message: "로그인 필요" });

  const latitude = parseFloat(req.body.latitude);
  const longitude = parseFloat(req.body.longitude);
  const keyword = req.body.keyword || ''; // 검색어

  if (isNaN(latitude) || isNaN(longitude))
    return res.status(400).send({ success: false, message: "위도/경도 값이 숫자여야 합니다." });

  try {
    // TB_MARKET: 가게/시장 정보를 가진 테이블이라고 가정
    const sql = `
      SELECT id, name, address, category, latitude, longitude,
        (6371 * ACOS(
          COS(RADIANS(?)) * COS(RADIANS(latitude)) * COS(RADIANS(longitude) - RADIANS(?))
          + SIN(RADIANS(?)) * SIN(RADIANS(latitude))
        )) AS distance
      FROM TB_MARKET
      WHERE latitude IS NOT NULL
        AND longitude IS NOT NULL
        AND name LIKE ?
      HAVING distance <= 10
      ORDER BY distance ASC;
    `;
    const [rows] = await db.execute(sql, [latitude, longitude, latitude, `%${keyword}%`]);

    res.send({ success: true, data: rows });
  } catch (err) {
    console.error("근처 장보기 조회 오류:", err);
    res.status(500).send({ success: false, message: "서버 오류" });
  }
});

// ======================
// 🧩 친구 요청 관련 라우터 추가
// ======================

// 친구 요청 보내기
router.post("/sendFriendRequest", async (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ success: false, message: "로그인 필요" });

  const from_id = req.session.user.id;
  const { to_id } = req.body;

  try {
    await db.execute(
      "INSERT INTO TB_FRIEND_REQUEST (from_id, to_id) VALUES (?, ?)",
      [from_id, to_id]
    );
    res.json({ success: true, message: "친구 요청 전송 완료" });
  } catch (err) {
    console.error("친구 요청 오류:", err);
    res.status(500).json({ success: false, message: "서버 오류" });
  }
});

// 받은 친구 요청 목록
router.get("/getFriendRequests", async (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ success: false, message: "로그인 필요" });

  const user_id = req.session.user.id;

  try {
    const [rows] = await db.execute(
      `
      SELECT r.from_id, m.name, m.hobby, m.phone, m.profile_text
      FROM TB_FRIEND_REQUEST r
      JOIN TB_MEMBER m ON r.from_id = m.id
      WHERE r.to_id = ? AND r.status = 'pending'
      `,
      [user_id]
    );
    res.json({ success: true, requests: rows });
  } catch (err) {
    console.error("친구 요청 목록 조회 오류:", err);
    res.status(500).json({ success: false, message: "서버 오류" });
  }
});

// 친구 요청 수락
router.post("/acceptFriendRequest", async (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ success: false, message: "로그인 필요" });

  const to_id = req.session.user.id;  // 내 id
  const { from_id } = req.body;       // 요청 보낸 사람 id

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 요청 상태 업데이트
    await conn.execute(
      "UPDATE TB_FRIEND_REQUEST SET status='accepted' WHERE from_id=? AND to_id=?",
      [from_id, to_id]
    );

    // TB_MEMBER에서 id_num 가져오기
    const [[fromMember]] = await conn.execute(
      "SELECT id_num FROM TB_MEMBER WHERE id = ?",
      [from_id]
    );
    const [[toMember]] = await conn.execute(
      "SELECT id_num FROM TB_MEMBER WHERE id = ?",
      [to_id]
    );

    if (!fromMember || !toMember) throw new Error("회원 정보를 찾을 수 없습니다.");

    const fromNum = fromMember.id_num;
    const toNum = toMember.id_num;

    // TB_FRIEND에 양방향 등록 (id_num 사용)
    await conn.execute(
      "INSERT INTO TB_FRIEND (user_id_num, friend_id_num) VALUES (?, ?), (?, ?)",
      [fromNum, toNum, toNum, fromNum]
    );

    await conn.commit();
    res.json({ success: true, message: "친구 요청 수락 완료" });
  } catch (err) {
    await conn.rollback();
    console.error("친구 요청 수락 오류:", err);
    res.status(500).json({ success: false, message: "서버 오류" });
  } finally {
    conn.release();
  }
});

module.exports = router;
