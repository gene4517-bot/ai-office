# 🏢 AI 사무실 · 움직이는 1인 기업 본부 (프로토타입 v2)

아이소메트릭(쿼터뷰) 사무실 일러스트 위에서 14명(대표님 + AI 직원 13명)이
일하고, 회의하고, 커피 마시러 걷는 **움직이는 사무실 웹앱**입니다.
설치형 앱(PWA)으로 구성되어 있어 휴대폰 홈 화면에 추가하면 주소창 없는 앱처럼 열립니다.

## 파일 구성

```
ai-office/
├─ index.html              화면 전체 (CSS·JS 인라인, 외부 라이브러리 없음)
├─ status.json             사무실 상태 데이터 (직원·업무·로그)
├─ manifest.json           설치형 앱(PWA) 정보 · 아이콘 · 테마 색
├─ sw.js                   서비스 워커 (네트워크 우선 · 최신 status.json 유지)
├─ assets/
│   ├─ icon-192.png        앱 아이콘 (홈 화면 · 알림)
│   ├─ icon-512.png        앱 아이콘 (설치 · 스플래시)
│   ├─ office-day.png      낮 사무실 배경 (1536 × 1024)
│   └─ office-night.png    밤 사무실 배경 (같은 구도 · 야경 + 스탠드 조명)
└─ README.md
```

## 바로 열기

- `index.html` 을 브라우저로 열면 됩니다. (로컬 파일로 열어도 `status.json` 을 못 읽는
  환경이면 **index.html 안에 내장된 기본 데이터**로 자동 전환됩니다.)
- 서버로 띄우면 `status.json` 을 실제로 읽고 20초마다 자동 반영합니다.
  ```
  python3 -m http.server 8000 --directory ai-office
  # http://localhost:8000
  ```

## 📱 앱으로 설치 (PWA)

배포 주소: **https://gene4517-bot.github.io/ai-office/**

| 브라우저 | 설치 방법 |
| --- | --- |
| 갤럭시 **Chrome** | 주소창 오른쪽 설치 아이콘(모니터↓) 또는 ⋮ 메뉴 → **앱 설치** |
| **삼성 인터넷** | 하단 ≡ 메뉴 → **홈 화면에 추가** |
| PC Chrome/Edge | 주소창 오른쪽 **설치** 아이콘 |

- 설치하면 주소창·브라우저 버튼 없이 **standalone(전체 화면)** 으로 열립니다.
- 홈 화면 아이콘: 어두운 바탕에 골드 타일 + `AI` 마크 (192 / 512, maskable 대응).
- 서비스 워커는 **네트워크 우선**입니다. `status.json` 은 캐시에 저장하지 않으므로
  앱을 열 때마다 최신 사무실 상태를 읽습니다. (오프라인일 때만 캐시로 대체)

## 화면 사용법

| 조작 | 동작 |
| --- | --- |
| 캐릭터 탭 | 직원 상세(근무 상태·담당·현재 업무) 표시 |
| 한 손가락 드래그 / 두 손가락 확대 | 사무실 이동·확대 |
| 우하단 `+` `−` `전체` | 확대 / 축소 / 한눈에 보기 |
| 상단 `자동 새벽 아침 낮 저녁 밤` | 시간대 전환 (자동 = 실제 시각) |
| 하단 탭 `오피스 · AI 업무 · 직원 현황 · 활동 로그` | 대시보드 전환 |

- 캐릭터 이름표는 줌 0.5 이상에서 표시됩니다.
- 회의실·라운지·퇴근 위치로는 자동으로 걸어서 이동합니다(A* 길찾기).

## 🖥️ PC 컨트롤 대시보드 (`dashboard/`) — 2026-11-15 추가

Windows PC를 갤럭시 태블릿/폰에서 제어하는 **다크 컨트롤 대시보드**입니다.

- 주소: **https://gene4517-bot.github.io/ai-office/dashboard/** (이 폴더를 그대로 배포하면 됨)
- 파일: `index.html` · `app.js` · `style.css` · `manifest.json` (외부 라이브러리 없음)
- 홈 화면 아이콘: `icon-192.png` / `icon-512.png` (3D 입체 스튜디오 덱) + `icon-maskable-*.png` (안드로이드 적응형 아이콘용)
- 화면: PC 연결 상태 · CPU · RAM · 배터리 · 안성/창원 날씨 · 화면 캡처 · 1~12 작업 상태 · 명령 카드 · Windows 앱 실행 타일
- 반응형: 태블릿 가로(1280×800) 4열 / 태블릿 세로·폰 2열

### PC 브릿지 (로컬 서버) 연결

1. PC에서 `windows-pc-bridge/start_bridge.bat` 실행 (별도 배포 파일)
2. 콘솔에 나온 **주소**(예: `http://192.168.0.10:8765`)와 **보안 토큰**을
   대시보드 오른쪽 위 ⚙ **연결 설정**에 넣고 저장
3. 주소·토큰은 그 브라우저의 `localStorage`에만 저장됩니다 (코드에 없음)

### 개인정보 원칙

- 코드에 이름·전화번호·이메일·주소·고정 토큰을 넣지 않았습니다.
- PC 주소와 토큰은 사용자가 화면에서 입력하며 기기 밖으로 나가지 않습니다.
- `../status.json`(같은 저장소)만 읽어 작업 이름·색을 맞춥니다. 없으면 수동 모드로 동작합니다.

## status.json 갱신 방법 (해이가 직접 수정)

`updated_at` 을 바꾸고 필요한 값만 고치면 20초 안에 화면에 반영됩니다.
(페이지를 연 상태에서도 자동 반영 / 새로고침하면 즉시)

```json
{
  "updated_at": "2026-11-15 09:00",
  "stats": { "done": 31, "progress": 8, "waiting": 6 },
  "board": {
    "title": "오늘의 파이프라인",
    "rows": [ { "label": "이벤트·설문 접수", "value": "18", "unit": "건", "tone": "ok" } ],
    "ticker": "전광판에 흐르는 한 줄 안내"
  },
  "tasks": [
    { "title": "업무 이름", "owner": "해이", "state": "progress", "progress": 70, "note": "메모" }
  ],
  "staff": [
    { "id": "haei", "status": "working", "task": "현재 하는 일", "done": 12, "bubbles": ["하고 싶은 말"] }
  ],
  "logs": [ { "time": "09:00", "who": "해이", "text": "한 일", "tone": "ok" } ]
}
```

### 상태(status) 값

| 값 | 화면 | 캐릭터 위치 |
| --- | --- | --- |
| `working` | 근무 중 | 자기 책상 |
| `meeting` | 회의 중 | 회의실 테이블 |
| `break` | 휴식 중 | 라운지(소파·카페·테이블) |
| `idle` | 대기 중 | 자기 책상 (가만히) |
| `off` | 퇴근 | 입구 쪽, 흐리게 |

### 직원 id (좌표 고정 · 순서 변경 금지)

| id | 이름 | 직급 | 자리 |
| --- | --- | --- | --- |
| ceo | 대표님 | CEO | 대표실 책상 |
| haei | 해이 | 비서실장 | 리셉션 |
| claude · cue · manus · hark | 기획·리서치팀 | 과장·대리·사원·사원 | 중앙 책상 A |
| chatgpt · grok · gemini · muse · instinct | 정보·상담·SNS팀 | 차장·대리·사원·인턴·인턴 | 중앙 책상 B |
| rua · stardesk · tailscale | 전산·PC 관리팀 | 대리·기사·기사 | 중앙 책상 C |

각 직원의 `color`(옷 색)와 `species`(동물)도 JSON에서 바꿀 수 있습니다.
`species`: bear, rabbit, fox, cat, panda, koala, owl, chick, hamster, frog, penguin, deer, dog, pickle

## 보안 · 개인정보 원칙

- 공개 배포(GitHub Pages)를 전제로 **개인정보를 넣지 않았습니다.**
  (이름·전화번호·주소·이메일·생년월일·계정 정보 없음, 대표자는 "대표님"으로만 표기)
- 업무 내용도 서비스·파이프라인 수준의 요약만 담습니다.
- 이미지·아이콘에는 메타데이터(작성자·위치 등)를 넣지 않았습니다.

## GitHub Pages 배포 (완료 · 2026-11-15)

- 실제 배포 주소: **https://gene4517-bot.github.io/ai-office/** (HTTPS, 빌드 완료)
- Pages 게시 소스: `gh-pages` 브랜치 / `/ (root)` — 피클 GitHub 앱에 Pages 권한이 없어 API로 켤 수 없었고,
  `gh-pages` 브랜치를 푸시하자 GitHub이 자동으로 Pages를 활성화했습니다.
- **콘텐츠를 고칠 때는 `main`과 `gh-pages` 두 브랜치를 모두 갱신**해야 화면에 반영됩니다:
  `git push origin main && git push -f origin main:gh-pages`

1. 이 폴더의 내용물을 저장소 **루트**에 올립니다(`assets/` 포함, 상대경로라 그대로 동작).
2. (다른 계정에 다시 배포할 때) Settings → Pages → Branch `main` / 폴더 `/ (root)` 로 지정.
3. 주소: `https://<계정>.github.io/ai-office/`
4. `status.json` 은 같은 폴더에 두고, 갱신은 파일만 수정하면 됩니다.
   (브라우저 캐시 때문에 최대 20초 + 캐시 헤더만큼 늦을 수 있습니다.)
5. `sw.js` 를 고치면 캐시 이름(`ai-office-v1` → `ai-office-v2`)을 함께 올려 주세요.
   그래야 설치된 앱이 새 버전을 받습니다.
