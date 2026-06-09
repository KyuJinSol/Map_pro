# 🧭 QR 기반 교통 약자 & 외국인 길 안내 웹 시스템

## 1. 프로젝트 취지 (Background)
낯선 장소나 복잡한 대중교통 시설(지하철역, 터미널 등)은 처음 방문하는 외국인과 거동이 불편한 노약자, 장애인 등의 교통 약자에게 큰 벽이 됩니다. 기존의 지도 앱들은 기능이 너무 복잡하거나 별도의 앱 설치 및 회원가입이 필요하여 접근성이 떨어집니다. 
우리 팀은 이러한 문제를 해결하기 위해, **"별도의 앱 설치 없이 현장의 QR 코드 스캔 한 번으로 즉시 실행되는 직관적인 웹 기반 길 안내 서비스"**를 개발합니다.

## 2. 개발 목표 (Goals)
- **최고의 접근성:** QR 스캔 즉시 3초 이내에 로딩되는 가벼운 Vanilla HTML/JS 기반 웹 서비스 구축
- **교통 약자 친화적 UI/UX:** 복잡한 기능은 걷어내고 큰 글씨, 직관적인 2D 이정표 중심의 단순화된 경로 제공
- **글로벌 지원:** 외국인 관광객을 위한 다국어(영어 등) 원터치 전환 기능 제공
- **풀스택 성장:** 2인 팀원 모두가 화면(FE)-서버(BE)-데이터베이스(SQL)로 이어지는 웹 서비스의 전체 사이클을 직접 구현하며 풀스택 역량 강화

## 🛠️ 프로젝트 초기 세팅 및 실행 방법

### 1. 저장소 복제 (Git Clone)

#### 방법 A) GitKraken을 사용하는 경우 (추천)
1. GitKraken을 실행합니다.
2. 좌측 상단 `File` -> `Clone Repo`를 클릭합니다.
3. `GitHub.com` 연동을 선택하거나, `URL` 탭에 본 저장소 주소(`https://github.com/...`)를 입력합니다.
4. 코드를 저장할 로컬 폴더(Local Path)를 지정한 뒤 **[Clone the repo!]** 버튼을 누릅니다.

#### 방법 B) 터미널(CLI)을 사용하는 경우
코드를 다운받을 폴더에서 터미널을 열고 아래 명령어를 입력합니다.
```bash
git clone https://github.com/여러분의_저장소_주소.git
cd 저장소_폴더명
```
```text
📂 project-root/
├── 📂 frontend/          # 프론트엔드 (HTML, CSS, JS)
│   ├── 📄 index.html     # QR 스캔 시 처음 뜨는 랜딩/언어 선택 페이지
│   ├── 📄 map.html       # 지도 및 경로 표시 페이지
│   ├── 📂 css/           # 스타일시트 폴더
│   └── 📂 js/            # API 호출 및 화면 제어 JS (index.js, map.js 등)
│
├── 📂 backend/           # 백엔드 서버 (Python + FastAPI)
│   ├── 📄 main.py        # 서버 실행 및 API 라우팅 총괄 (가장 중요!)
│   ├── 📄 database.py    # SQL 데이터베이스(DB) 연결 설정 파일
│   └── 📄 requirements.txt # 설치해야 하는 파이썬 패키지 목록 (FastAPI, SQL 연동 툴 등)
│
└── 📄 README.md          # 우리 팀의 가이드북
```

## 🤝 우리 팀의 개발 규칙 (Ground Rules)

### 1. 개발 환경 및 툴
- **Frontend: Vanilla HTML / CSS / JavaScript**
- **Backend: Python (FastAPI)**
- **Database:** SQL (예: MySQL)
- **VCS / Tool:** GitHub, GitKraken, VS Code

### 2. 브랜치 및 커밋 전략
- **기본 브랜치:** `main` (배포), `develop` (통합)
- **기능 브랜치:** `feature/기능이름` (각자 개발)

#### 💡 커밋 메시지 규칙 (Commit Convention)
메시지는 `[태그] 작업 내용` 형태로 작성하며, 동사형태는 명사형(~함, ~추가)으로 통일합니다.

- **[Feat]** : 새로운 기능 개발
  - 예: `[Feat] index.html 다국어 선택 버튼 추가`
  - 예: `[Feat] FastAPI 지도 데이터 조회 API 구현`
- **[Fix]** : 버그 및 에러 수정
  - 예: `[Fix] 영어 선택 시 텍스트 깨지는 오류 수정`
  - 예: `[Fix] 데이터베이스 연결 타임아웃 에러 해결`
- **[Design]** : UI/UX 디자인 및 CSS 수정
  - 예: `[Design] 노약자용 메인 버튼 크기 확대 및 색상 변경`
- **[Docs]** : 문서 수정 (README 등)
  - 예: `[Docs] 리드미 커밋 메시지 규칙 구체화`
- **[Refactor]** : 코드 리팩토링 (기능은 같지만 코드 구조 개선)
  - 예: `[Refactor] main.py 중복되는 CORS 설정 함수 분리`
- **[Chore]** : 패키지 설치 및 환경 설정 변경
  - 예: `[Chore] requirements.txt에 PyMySQL 패키지 추가`

### 3. 개발 시작 & 종료 체크리스트
- **개발 시작할 때 꼭 하기:**
  1. `develop` 브랜치로 이동 후 최신 코드 `Pull` 받기
  2. 내 기능 브랜치(`feature/...`)로 이동해서 `develop` 브랜치 내용 `Merge` 받아오기 (충돌 방지!)
- **개발 끝났을 때 꼭 하기:**
  1. 로컬에서 정상 작동하는지 최종 테스트
  2. 내 브랜치에 `Commit` 후 GitHub에 `Push`
  3. `develop` 브랜치로 Pull Request(PR) 날리기 (팀원에게 알리기)

### 4. 코드 및 DB 규칙
- **변수/함수명:** camelCase 사용 (`qrScanner`)
- **DB 컬럼명:** snake_case 사용 (`user_id`)
- **SOS 룰:** 하나의 에러로 30분 이상 막히면 무조건 팀원에게 SOS 요청하기!

### 5. 정기 회의 시간
- **일시:** 매주 일요일 오후 8시
- **내용:** 라이브 코드 리뷰, 다음 목표 설정
- **진행 방식 (라이브 코드 리뷰):**
  1. 일주일 동안 담당한 `feature` 브랜치 개발 완료 후 `develop`으로 Pull Request(PR) 생성
  2. 정기 회의 시간에 팀원이 모여 생성된 PR의 프론트-백엔드 코드를 교차 검토 (Code Review)
  3. 기능 데모 확인 후 승인(Approve) 및 `develop` 브랜치로 최종 병합(Merge)
  4. 다음 주차 스프린트 계획 및 일감 할당
