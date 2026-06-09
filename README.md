# 🗺️ Map_pro (Mapping Program Project)

이 프로젝트는 길 안내 서비스를 제공하는 매핑 프로그램 개발 프로젝트입니다. 팀원들과의 원활한 협업을 위해 정석적인 Git 브랜치 전략과 안전한 작업 워크플로우를 적용하여 관리합니다.

---

## 🌿 브랜치 전략 (Branch Strategy)

우리는 프로젝트의 안정성과 효율적인 협업을 위해 다음과 같은 브랜치 구조를 사용합니다.

* **`main`**: 언제든 실서비스에 배포 가능한 가장 안정적인 상태의 최상위 브랜치입니다.
* **`develop`**: 팀원들이 각자 개발한 기능들을 하나로 모으는 **'중심 개발 광장'**입니다. 모든 기능 개발의 기준점이 됩니다.
* **`feature/`**: 각자 맡은 기능을 개발하는 **'나만의 격리된 방'**입니다.
    * *예시:* 프론트엔드 UI 작업 시 `feature/front`, 파일 삭제 작업 시 `feature/delete-file` 등
    * *규칙:* 반드시 `develop` 브랜치에서 분기하여 작업하며, 작업이 완료되면 `develop`을 대상으로 Pull Request(PR)를 보냅니다.

---

## 🛠️ 프로젝트 초기 세팅 내역

1.  **Git 저장소 초기화**: `Map_pro` 폴더 내 독립된 로컬 저장소 구축 완료 (`git init`)
2.  **.gitignore 설정**: OS 및 IDE 자동 생성 파일 등 불필요한 파일의 추적 제외 설정 완료
    * 제외 대상: `.DS_Store`, `Thumbs.db`, `.vscode/`, `.idea/`
3.  **원격 저장소 연결**: GitHub 원격 레포지토리 연동 완료
    * URL: `https://github.com/KyuJinSol/Map_pro.git`

---

## 🚀 Git 기본 작업 가이드 (Git Workflow)

### 1. 새로운 기능 개발 시작하기
항상 중심 공간(`develop`)이 최신 상태인지 확인한 후, 기능을 개발할 개인 작업 방을 생성합니다.
```bash
# 1. develop 브랜치로 이동 후 최신 코드 가져오기
git switch develop
git pull origin develop

# 2. 내 기능 개발을 위한 새로운 방 생성 및 이동
git switch -c feature/기능이름 (예: feature/front)
