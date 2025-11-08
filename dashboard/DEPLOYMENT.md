# 데이터셋 품질검사 대시보드 배포 가이드

## Docker를 사용한 배포

### 사전 요구사항
- Docker 및 Docker Compose 설치
- 서버 또는 클라우드 인스턴스 (Railway, Render, DigitalOcean 등)

### 로컬 테스트

1. **프로젝트 디렉토리로 이동**
```bash
cd /Users/isangmin/work/text_labeling_ai_model/dashboard
```

2. **Docker 이미지 빌드 및 실행**
```bash
docker-compose up --build
```

3. **브라우저에서 접속**
- 프론트엔드: http://localhost:80
- 백엔드 API: http://localhost:8000

4. **중지**
```bash
docker-compose down
```

### 데이터 파일 준비

배포 전에 필요한 데이터 파일을 준비하세요:

```
dashboard/
├── data/
│   ├── final/
│   │   ├── labeled_data.csv        # 라벨링 데이터
│   │   └── preprocessed_data.csv   # 전처리 데이터
│   └── similar_questions.csv       # 유사질문 데이터
└── inspection_results/             # 검수 결과 저장 폴더 (자동 생성)
```

### Railway 배포 (무료)

Railway는 무료 티어를 제공하며 쉽게 Docker 앱을 배포할 수 있습니다.

1. **Railway 계정 생성**
   - https://railway.app 접속
   - GitHub 계정으로 로그인

2. **프로젝트 생성**
   - "New Project" 클릭
   - "Deploy from GitHub repo" 선택
   - 리포지토리 연결 (또는 "Empty Project" 선택)

3. **서비스 추가**

   **Backend 서비스:**
   - "New Service" → "Docker"
   - Root Directory: `dashboard/backend`
   - Port: `8000`
   - Volume 마운트:
     - `/app/data` → 데이터 파일 업로드
     - `/app/inspection_results` → 영구 저장소

   **Frontend 서비스:**
   - "New Service" → "Docker"
   - Root Directory: `dashboard/frontend`
   - Port: `80`
   - Environment Variables:
     - `VITE_API_URL` = `http://backend:8000` (내부 통신)

4. **데이터 파일 업로드**
   - Railway CLI 사용 또는
   - Volume에 직접 파일 업로드

5. **도메인 설정**
   - Frontend 서비스에서 "Generate Domain" 클릭
   - 생성된 URL로 접속

### Render 배포

1. **Render 계정 생성**
   - https://render.com 접속

2. **Web Service 생성**
   - "New" → "Web Service"
   - Docker 선택
   - 리포지토리 연결

3. **환경 설정**
   - Backend: Port 8000, Dockerfile 경로 지정
   - Frontend: Port 80, Dockerfile 경로 지정

### 보안 고려사항

1. **CORS 설정 확인**
   - `backend/main.py`에서 배포 도메인을 `allow_origins`에 추가

2. **환경 변수**
   - API 키나 민감한 정보는 환경 변수로 관리

3. **HTTPS 설정**
   - Railway/Render는 자동으로 HTTPS 제공
   - 커스텀 도메인 사용 시 SSL 인증서 설정

### 문제 해결

**컨테이너가 시작되지 않는 경우:**
```bash
# 로그 확인
docker-compose logs backend
docker-compose logs frontend

# 컨테이너 재시작
docker-compose restart
```

**데이터 파일을 찾을 수 없는 경우:**
- Volume 마운트 경로 확인
- 파일 권한 확인 (`chmod` 사용)

**API 연결 오류:**
- nginx 프록시 설정 확인 (`frontend/nginx.conf`)
- Backend 서비스가 정상 동작하는지 확인

### 비용 안내

- **Railway**: 월 $5 크레딧 무료, 초과 시 과금
- **Render**: 무료 티어 (750시간/월), 비활성 시 중지됨
- **DigitalOcean**: 월 $4부터 시작

### 백업 권장사항

검수 결과는 `inspection_results/` 폴더에 JSON 파일로 저장됩니다.
정기적으로 백업하는 것을 권장합니다:

```bash
# 로컬로 백업
docker cp <container_id>:/app/inspection_results ./backup/

# 또는 Volume 직접 복사
docker-compose exec backend tar czf /tmp/backup.tar.gz /app/inspection_results
docker cp <container_id>:/tmp/backup.tar.gz ./
```

## 업데이트

코드 변경 후 재배포:

```bash
# 이미지 재빌드
docker-compose build

# 서비스 재시작
docker-compose up -d
```

Railway/Render에서는 Git push 시 자동 배포됩니다.
