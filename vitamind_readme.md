# 💚 VitaMind – 시니어의 마음을 잇는 지역사회 동네친구 플랫폼

> “외로운 노년이 아니는, 연결된 노년으로.”

VitaMind는 **고립된 시니어분들이 지역사회 안에서 친구를 만들고 정서적 교류를 이어갈 수 있도록 동해주는 ‘동네친구 기반 헬스케어 서비스’**입니다.

---

## 📌 프로젝트 개요

고령화가 급속히 진행되는 한국 사회에서 “혼자 있는 시니어” 문제는 사회적 도르름의 핵심 과제로 떠오르고 있습니다.

2018년~2023년 통계에 따르면:

- 주 1회 이상 대면·비대면 대화가 전혀 없는 시니어 비율 증가  
- 주기적으로 교류하는 사람이 1명 이하인 경우 당약  
- 외출 빈도 주 1회 미만으로 사회활동이 거의 없는 상태  

이들은 같은 아파트, 같은 동네에 살지만 서로의 존재조차 모르고 고립된 삶을 보내고 있습니다.  
VitaMind는 이러한 문제를 해결하기 위해 **“시니어의 지역사회 계속 거주(Aging in Place)”**를 목표로 합니다.

---

## 🌟 프로젝트 목표

외로움과 우울로부터 벗어나, 지역사회 속에서 서로를 지지하며 살아갈 수 있는 환경 조성

**주요 목표**  
- 동네 친구 연결 → 아파트 단지·근처 시니어 간 매칭  
- 정서적 교류 초직 → 취미, 산책, 대화 등 일상 교류 기획 제공  

---

## 🧠 서비스 구성

### 📱 VitaMind 앱 / 웹 서비스
- 관심사 기반 친구 추천 및 활동 알림  
- 메시지, 소모임 일정, 정서 상태 알림 기능  

### 🌡️ 라즈베리파이 + 센서 연동
- 실내 환경(온도, 습도, 활동량) 감지  
- “오늘은 춝습습니다.” 등 음성·문자 안내  
- 장시간 미활동 시 자동 알림 및 가족/복지기관 통보  

### 🧹 FastAPI 기반 서버 & 데이터 분석
- 개인 활동 로그·대화 빈도 데이터 수집  
- AI 정서분석 알고리즘을 통해 위험 지육 감지  

💡 **서비스 핵심 개념**  
> “혼자 사는 시니어를, 함께 사는 이움으로.”

---

## ⚙️ 기술 스택

- **Frontend:** HTML, CSS, JavaScript  
- **Backend:** Node.js (Express), FastAPI  
- **Database:** MariaDB (Campus DB)  
- **Hardware:** Raspberry Pi 4 + DHT22, PIR, GPS, Ultrasonic  
- **Infra:** ngrok, VNC  

---

## 🖥️ 시스템 구조

```text
[Sensor (Raspberry Pi)] → FastAPI → Node.js(Express) → MariaDB → Dashboard (Web)
```

---

## 👥 팀원 구성

| 이름  | 역할         | 주요 담당                          |
|------|--------------|------------------------------------|
| 권조일 | 기획 & 개발 총권 | 라즈베리파이 센서, 지도 API, 문서 작성 |
| 김선범 | 프론트엔드 & 백엔드 | HTML/CSS, FastAPI, Node.js 통합, DB |
| 양경선 | 디자인 | 대시보드 UI, 문서 작성, 발표 |
| 형진명 | 백엔드 | 라즈베리파이 센서, 지도 검색 기능 구현, 발표 |

---

## 🚀 빠른 시작

### 요구사항
- Node.js 18+
- Python 3.11
- MariaDB 10.6+
- Raspberry Pi OS (Bullseye 이상)

### 설치
```bash
# 1) 클론
git clone https://github.com/2025-SMHRD-IS-HealthCare-1/joil_Team.git
cd joil_Team

# 2) 프론트/백엔드(Node)
npm install

# 3) 라즈베리파이(FastAPI)
cd sensor_api
python -m venv venv
source venv/bin/activate  # (Windows: venv\Scripts\activate)
pip install -r requirements.txt
```

### 실행
```bash
# 터미널 A: FastAPI
cd sensor_api && source venv/bin/activate
uvicorn app:app --host 0.0.0.0 --port 8000

# 터미널 B: Node/Express
cd joil_Team
npm run dev  # 또는 node server.js
```

---

## 🔐 환경 변수 (.env 예시)

```env
# node/express
PORT=3000
DB_HOST=project-db-campus.smhrd.com
DB_PORT=3307
DB_USER=campus_25is_health1_p2_2
DB_PASS=smhrd2
DB_NAME=campus_25is_health1_p2_2
CORS_ORIGIN=*

# fastapi
FASTAPI_PORT=8000
SENSOR_SAFE_MODE=false  # 테스트시 true

# 외부 서비스
NGROK_AUTHTOKEN=xxx
KAKAO_MAP_KEY=xxx
OPENWEATHER_KEY=xxx
```

---

## 🔗 API 엔드포인트

| Method | Path | 설명 | 예시 응답 |
|--------|------|------|-----------|
| GET | /health | 서버 헬스체크 | `{ "ok": true }` |
| GET | /sensor | 센서 종합 스냅샷 | `{ pir:0, distance_cm:120 }` |
| GET | /dht | 온습도 | `{ temperature_c: 23.1, humidity: 45.2 }` |
| GET | /gps | 위경도 | `{ lat: 35.15, lng: 126.90, sats: 6 }` |
| GET | /api/stats/joins7d | 최근 7일 가입수 | `[ { date:"2025-10-26", count:2 }, ... ]` |

---

## 🗃️ 데이터 모델 요약

- **tb_member** (id, nickname, created_at, …)  
- **tb_friend** (member_id, friend_id, status, updated_at)  
- **tb_activity** (id, member_id, type, created_at)  
- **tb_rec** (id, file_name, path, size, duration_sec, created_at)  

---

## 🧠 라즈베리파이 GPIO 매핑

| 센서 | BCM 핀 | 비고 |
|------|--------|------|
| DHT22 | 4 | 데이터핀, 10k 저항 권장 |
| PIR (HC-SR501) | 21 | 입력 |
| GPS (ATGM336H) | ttyS0 | UART 통신 |

---

## 🌐 배포 & 외부접속

```bash
# FastAPI(8000) → ngrok
ngrok http 8000

# Node(3000) → ngrok
ngrok http https://localhost:3000  # HTTPS 로컬 인증서 사용 경우
```

---

## ♿

