// sim_monitor.js
// 목적: pir 무동작 감시. 09~22시만 작동. 임계 초과 시 '연락 보냄(시뮬레이션)' 기록.
// 실제 발송 없음. 메모리 상태만 유지.

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

// ---- state ----
const state = {
  rasp_base: process.env.RASP_BASE || 'http://192.168.219.216:8000', // rasp ip:port (fix: no triple slash)
  start_hour: 9,
  end_hour: 22,
  inactivity_min: 30,
  poll_sec: 30,
  last_motion_at: null, // Date | null
  last_alert_at: null,  // Date | null
  alerting: false,
  log: [],
};

// ---- utils ----
function addLog(type, msg) {
  state.log.unshift({ ts: new Date().toISOString(), type, msg });
  if (state.log.length > 100) state.log.length = 100;
  try { console.log(`[sim][${type}] ${msg}`); } catch (_) {}
}

function now() { return new Date(); }

function inWindow(d) {
  const h = d.getHours();
  return state.start_hour <= h && h < state.end_hour;
}

function buildUrl(path) {
  const base = state.rasp_base.replace(/\/+$/, '');
  return new URL(path, base).toString();
}

// fetch with timeout using AbortController (node-fetch v3)
async function fetchJson(url, ms = 5000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(url, { signal: ac.signal });
    if (!r.ok) throw new Error(`http ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

async function getSensor() {
  try {
    return await fetchJson(buildUrl('/sensor'), 5000);
  } catch (e) {
    addLog('err', `sensor fetch fail: ${e.message}`);
    return null;
  }
}

// ---- loop ----
async function tick() {
  const t = now();
  if (!inWindow(t)) { state.alerting = false; return; }

  const js = await getSensor();
  if (js && (js.pir === 1 || js.pir === '1')) {
    state.last_motion_at = t;
    if (state.alerting) addLog('info', 'motion resumed; alert will clear');
    state.alerting = false;
  }

  if (state.last_motion_at) {
    const elapsed_ms = t - state.last_motion_at; // Date diff → ms
    const need = state.inactivity_min * 60 * 1000;
    if (elapsed_ms >= need && !state.alerting) {
      state.alerting = true;
      state.last_alert_at = t;
      addLog('alert', `no motion ${Math.round(elapsed_ms / 60000)}m; simulated sends`);
    }
  }
}

let timer = null;

function start() {
  if (timer) clearInterval(timer);
  addLog('info', 'sim monitor started');
  // run once immediately, then interval
  tick().catch(e => addLog('err', `tick fail: ${e.message}`));
  timer = setInterval(() => tick().catch(e => addLog('err', `tick fail: ${e.message}`)), state.poll_sec * 1000);
}

function stop() {
  if (timer) { clearInterval(timer); timer = null; }
  addLog('info', 'sim monitor stopped');
}

function setConfig(patch = {}) {
  if (typeof patch.rasp_base === 'string') state.rasp_base = patch.rasp_base;
  if (Number.isFinite(patch.start_hour)) state.start_hour = patch.start_hour | 0;
  if (Number.isFinite(patch.end_hour)) state.end_hour = patch.end_hour | 0;
  if (Number.isFinite(patch.inactivity_min)) state.inactivity_min = patch.inactivity_min | 0;
  if (Number.isFinite(patch.poll_sec)) { state.poll_sec = patch.poll_sec | 0; start(); }
  addLog('info', `config: ${JSON.stringify({
    rasp_base: state.rasp_base,
    start_hour: state.start_hour,
    end_hour: state.end_hour,
    inactivity_min: state.inactivity_min,
    poll_sec: state.poll_sec
  })}`);
}

function mockMotion() { state.last_motion_at = now(); state.alerting = false; addLog('test', 'mock motion'); }
function mockAlert()  { state.alerting = true; state.last_alert_at = now(); addLog('test', 'mock alert'); }
function resetAlert() { state.alerting = false; addLog('info', 'alert reset'); }

function snapshot() {
  return {
    rasp_base: state.rasp_base,
    start_hour: state.start_hour,
    end_hour: state.end_hour,
    inactivity_min: state.inactivity_min,
    poll_sec: state.poll_sec,
    last_motion_at: state.last_motion_at ? state.last_motion_at.toISOString() : null,
    last_alert_at: state.last_alert_at ? state.last_alert_at.toISOString() : null,
    alerting: state.alerting,
    in_window: inWindow(now()),
    log_size: state.log.length,
    log: state.log.slice(0, 50),
  };
}

function getState() { return snapshot(); }

module.exports = { state, start, stop, setConfig, mockMotion, mockAlert, resetAlert, snapshot, getState };