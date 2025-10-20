const express = require('express');
const router = express.Router();
const db = require('../config/db');

// 회원가입
router.post('/register', (req, res) => {
    let { name, age, id, pw, phone, latitude, longitude } = req.body;     // 변수 3개에 각각 값을 할당

    /*  DB에 데이터를 추가
        db연결정보를 통해서 body데이터를 db에 추가
        
        db연결을 위한 프로세스
         1) SQL문 작성
         2) 값을 넣어주기 위해서 JS와 SQL 합하기
         3) 연결정보(db)를 통해서 SQL문 실행
    */

    // ? : sql 인젝션 때문에 ?를 써서 무언가 들어갈거라고 알려주는거
    const sql = "INSERT INTO TB_MEMBER (name, age, id, pw, phone) VALUES (?, ?, ?, ?, ?)";
    // [? ? ?] : 변수 
    const params = [name, age, id, pw, phone];

    db.execute(sql, params, (err, result) => {
        if (err) {
        console.error("DB 오류:", err.message);
        return res.status(500).send("서버 오류가 발생했습니다.");
        };

        if (result.affectedRows > 0) {
            // 회원 가입 성공
            res.redirect("/");
        }
        else {
            // 회원 가입 실패
            res.redirect('/register');
        };
    });
});

// 로그인
router.post("/login", (req, res) => {
  const { id, pw } = req.body;
  const sql = "SELECT * FROM TB_MEMBER WHERE id = ? AND pw = ?";
  const params = [id, pw];

  db.execute(sql, params, (err, rows) => {
    if (err) {
      console.error("DB 오류:", err.message);
      return res.status(500).send("서버 오류");
    }

    if (rows.length > 0) {
      // ✅ 세션에 로그인 정보 저장
      req.session.user = {
        id: rows[0].id,
        name: rows[0].name
      };

      // ✅ 사용자 ID를 쿠키에 저장 (프론트에서 사용 가능하도록)
      res.cookie("userId", rows[0].id, {
        httpOnly: false,        // 프론트 JS에서 읽을 수 있어야 하므로 false
        maxAge: 1000 * 60 * 60  // 1시간
      });

      console.log("✅ 로그인 성공:", req.session.user);
      res.status(200).send({ success: true });
    } else {
      res.status(401).send({ success: false, message: "로그인 실패" });
    }
  });
});

// ✅ 로그아웃 API 추가
router.post('/logout', (req, res) => {
    if (req.session.user) {
        // 세션 파괴 (로그아웃 처리)
        req.session.destroy(err => {
            if (err) {
                console.error("세션 파괴 오류:", err);
                return res.status(500).send({ success: false, message: "로그아웃 중 서버 오류" });
            }
            // 쿠키 삭제 (선택적이지만 클린업을 위해 권장)
            res.clearCookie("userId"); 
            console.log("✅ 로그아웃 성공");
            res.send({ success: true });
        });
    } else {
        // 이미 로그아웃 상태
        res.send({ success: true, message: "이미 로그아웃되었습니다." });
    }
});


// 실습 문제
// 회원정보 수정
// 값이 변할 경우 row에 영향이 간다 (result.affectedRows로 확인 가능)
// (조회) 값 변하지 않으면 (rows.length로 확인)
// 회원정보 수정은 id와 pw를 검사해서 맞는 경우, 닉네임을 수정해주는 케이스
const path = require("path");
router.post("/update", (req, res) => {
    const { id, pw, nick } = req.body;

    const sql = "UPDATE TB_MEMBER SET nick = ? WHERE id = ? AND pw = ?"
    const params = [nick, id, pw];

    db.execute(sql, params, (err, result) => {
        console.log(result);
        if (result.affectedRows > 0) {
            res.sendFile(path.join(__dirname, "../public/registerSuc.html"));
        }
        else {
            res.redirect("/update")
        };
    });
});

// 회원 탈퇴
router.post("/delete", (req, res) => {
    const { id, pw } = req.body;

    const sql = "DELETE FROM TB_MEMBER WHERE id = ? AND pw = ?"
    const params = [id, pw];

    db.execute(sql, params, (err, result) => {
        console.log(result);
        if (result.affectedRows > 0) {
            res.sendFile(path.join(__dirname, "../public/deleteSuc.html"));
        }
        else {
            res.redirect("/delete");
        };
    });
});

// ✅ 위치 업데이트 API
router.post('/updateLocation', (req, res) => {
  if (!req.session.user) {
    return res.status(401).send({ success: false, message: "로그인 필요" });
  }

  const id = req.session.user.id;
  const { latitude, longitude } = req.body;

  if (typeof latitude === 'undefined' || typeof longitude === 'undefined') {
    return res.status(400).send({ success: false, message: "latitude, longitude 필요" });
  }

  const sql = "UPDATE TB_MEMBER SET latitude = ?, longitude = ? WHERE id = ?";
  const params = [latitude, longitude, id];

  db.execute(sql, params, (err, result) => {
    if (err) {
      console.error("📍 위치 업데이트 오류:", err.message);
      return res.status(500).send({ success: false, message: "서버 오류" });
    }

    console.log(`✅ 위치 업데이트 완료: ${id} (${latitude}, ${longitude})`);
    res.send({ success: true, affectedRows: result.affectedRows });
  });
});


// ✅ 반경 10km 내 사용자 조회 (Haversine formula)
router.post('/nearby', (req, res) => {
  if (!req.session.user) {
    return res.status(401).send({ success: false, message: "로그인 필요" });
  }

  const { latitude, longitude } = req.body;



  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
  return res.status(400).send({ success: false, message: "latitude, longitude는 숫자여야 합니다." });
}

  if (typeof latitude === 'undefined' || typeof longitude === 'undefined') {
    return res.status(400).send({ success: false, message: "latitude, longitude 필요" });
  }

   // 숫자 변환 및 체크
  let latNum = Number(latitude);
  let lonNum = Number(longitude);

  if (isNaN(latNum) || isNaN(lonNum)) {
    return res.status(400).send({ success: false, message: "latitude, longitude가 숫자가 아닙니다." });
  }

  const userId = req.session.user.id;

  const sql = `
    SELECT id, name, latitude, longitude,
      (6371 * ACOS(
         COS(RADIANS(?)) * COS(RADIANS(latitude)) * COS(RADIANS(longitude) - RADIANS(?))
         + SIN(RADIANS(?)) * SIN(RADIANS(latitude))
      )) AS distance
    FROM TB_MEMBER
    WHERE latitude IS NOT NULL
      AND longitude IS NOT NULL
      AND id <> ?           -- 자기 자신 제외
    HAVING distance <= ?
    ORDER BY distance ASC;
  `;

  const radius = 10;  // km
  const params = [latitude, longitude, latitude, userId, radius];

  db.execute(sql, params, (err, rows) => {
    if (err) {
      console.error("📡 근처 사용자 조회 오류:", err.message);
      return res.status(500).send({ success: false, message: "서버 오류" });
    }

    console.log(`📍 근처 ${rows.length}명 조회됨 (쿼리 기준)`);
    res.send({ success: true, data: rows });
  });
});

module.exports = router;