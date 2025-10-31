// routes/simAlertRouter.js
// 목적: 시뮬레이터 상태 조회/설정/테스트용 api.
// 실제 발송 없음. ui에서 읽어 표시만 함.

const express = require('express');
const router = express.Router();
const sim = require('../sim_monitor');

router.get('/state', (req, res) => {        // 상태 조회
  return res.json({ ok: true, data: sim.snapshot() });
});

router.get('/log', (req, res) => {          // 로그 조회
  return res.json({ ok: true, data: sim.state.log });
});

router.post('/config', (req, res) => {      // 설정 변경
  sim.setConfig(req.body || {});
  return res.json({ ok: true, data: sim.snapshot() });
});

router.post('/mock/motion', (req, res) => { // 모션 가짜 발생
  sim.mockMotion();
  return res.json({ ok: true });
});

router.post('/mock/alert', (req, res) => {  // 경보 가짜 발생
  sim.mockAlert();
  return res.json({ ok: true });
});

router.post('/reset', (req, res) => {       // 경보 해제
  sim.resetAlert();
  return res.json({ ok: true });
});

module.exports = router;
