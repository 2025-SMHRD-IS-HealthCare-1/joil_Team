// src/public/admin.js

// util: 최근 7일(mm-dd) 라벨
function last7days_labels() {
  const arr = [];
  const d = new Date();
  for (let i = 6; i >= 0; i--) {
    const x = new Date(d);
    x.setDate(d.getDate() - i);
    arr.push(x.toISOString().slice(5, 10)); // 'mm-dd'
  }
  return arr;
}

// util: rows([{d:'2025-10-22', c:3}]) -> 올해 기준 mm-dd 매칭
function align7(labels, rows) {
  const map = new Map(rows.map(r => [String(r.d), Number(r.c)]));
  return labels.map(mmdd => {
    const full = `${new Date().getFullYear()}-${mmdd}`;
    return map.get(full) || 0;
  });
}

// fetch helper
async function jget(url) {
  const r = await fetch(url, { credentials: 'same-origin' });
  if (!r.ok) throw new Error(`${url} ${r.status}`);
  return r.json();
}

let pie_chart = null;
let signup_chart = null;
let activity_chart = null;
let labels7 = last7days_labels();

// 초기 차트 생성 (한 번만)
function init_charts() {
  const pie_ctx = document.getElementById('chart-pie').getContext('2d');
  pie_chart = new Chart(pie_ctx, {
    type: 'doughnut',
    data: {
      labels: ['WAIT', 'ACCEPT', 'DONE'],
      datasets: [{ data: [0, 0, 0] }]
    },
    options: { plugins: { legend: { position: 'bottom' } } }
  });

  const s_ctx = document.getElementById('chart-signup').getContext('2d');
  signup_chart = new Chart(s_ctx, {
    type: 'line',
    data: { labels: labels7, datasets: [{ label: '가입수', data: new Array(7).fill(0), tension: 0.3 }] },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });

  const a_ctx = document.getElementById('chart-activity').getContext('2d');
  activity_chart = new Chart(a_ctx, {
    type: 'line',
    data: { labels: labels7, datasets: [{ label: '활동수', data: new Array(7).fill(0), tension: 0.3 }] },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });
}

// 카드/테이블 그리기
function render_cards(sum) {
  document.getElementById('card-total').textContent    = sum.total_members ?? 0;
  document.getElementById('card-signup').textContent    = sum.today_signup ?? 0;
  document.getElementById('card-activity').textContent  = sum.today_activity ?? 0;
  document.getElementById('card-open').textContent      = sum.open_match ?? 0;
}

function render_recent(rows) {
  const tbody = document.getElementById('recent-tbody');
  tbody.innerHTML = (rows && rows.length)
    ? rows.map(r => `
      <tr>
        <td>${r.id}</td>
        <td>${r.name || '-'}</td>
        <td>${r.phone || '-'}</td>
        <td>${new Date(r.join_date).toLocaleString()}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="4">데이터 없음</td></tr>';
}

// 차트 데이터만 갱신
function update_charts(sum, daily_signup_rows, daily_activity_rows) {
  // pie
  const s_map = { WAIT: 0, ACCEPT: 0, DONE: 0 };
  (sum.statuses || []).forEach(s => { s_map[String(s.req_status).toUpperCase()] = Number(s.cnt) || 0; });
  pie_chart.data.datasets[0].data = [s_map.WAIT, s_map.ACCEPT, s_map.DONE];
  pie_chart.update();

  // signup line
  const join_data = align7(labels7, daily_signup_rows);
  signup_chart.data.datasets[0].data = join_data;
  signup_chart.update();

  // activity line
  const act_data = align7(labels7, daily_activity_rows);
  activity_chart.data.datasets[0].data = act_data;
  activity_chart.update();
}

// 전체 갱신 (카드/테이블/차트 데이터)
async function refresh_all() {
  const sum = await jget('/api/admin/summary');
  const recent = await jget('/api/admin/recent-joins');
  const daily_join = await jget('/api/admin/daily-signup');
  const daily_act  = await jget('/api/admin/daily-activity');

  render_cards(sum);
  render_recent(recent);
  update_charts(sum, daily_join, daily_act);
}

// 엔트리: ⬇⬇⬇ 이 블록이 "DOM 로드시 1회 + 5초마다" 정확한 위치
document.addEventListener('DOMContentLoaded', async () => {
  try {
    init_charts();          // 차트 캔버스 1회 생성
    await refresh_all();    // 최초 데이터 반영
    setInterval(refresh_all, 5000); // 5초마다 최신화
  } catch (e) {
    console.error('[admin] init failed', e);
    alert('대시보드 갱신에 실패했습니다. 콘솔을 확인하세요.');
  }
});
