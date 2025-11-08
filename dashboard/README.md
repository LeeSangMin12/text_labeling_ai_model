# 데이터셋 검수 대시보드

지식 공유 SNS 플랫폼 '문'의 데이터셋 검수를 위한 웹 기반 대시보드 시스템입니다.

## 📋 프로젝트 개요

본 프로젝트는 **인수기준서**에 따라 전처리 데이터와 라벨링 데이터의 품질을 검수하기 위한 시스템입니다.

### 인수 기준

#### 1. 전처리 데이터셋 (100,000건)
- ✅ 레코드 수: 100,000건
- ✅ 결측률, 중복률: 5% 이하
- ✅ 필수필드 포함: 100%
- ✅ 이상치 응답: 10% 이내
- 검수 방법: 1,000건씩 2회 무작위 샘플링

#### 2. 라벨링 데이터셋 (10,000건)
- ✅ 라벨링 수량: 10,000건
- ✅ 최종검수 일치율: 90% 이상
- ✅ 라벨 누락/오분류율: 3% 이하
- 검수 방법: 500건씩 2회 무작위 샘플링

---

## 🏗️ 시스템 구조

```
dashboard/
├── backend/          # FastAPI 백엔드
│   ├── main.py      # API 서버
│   └── requirements.txt
├── frontend/         # React 프론트엔드
│   ├── src/
│   │   ├── api/     # API 클라이언트
│   │   ├── pages/   # 페이지 컴포넌트
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## 🚀 빠른 시작

### 1. 사전 요구사항

- **Python 3.8+**
- **Node.js 16+**
- **npm 또는 yarn**

### 2. 백엔드 실행

```bash
# dashboard/backend 디렉토리로 이동
cd dashboard/backend

# 가상환경 생성 (선택사항)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 패키지 설치
pip install -r requirements.txt

# 서버 실행
python main.py
```

백엔드 서버가 **http://localhost:8000**에서 실행됩니다.

### 3. 프론트엔드 실행

새 터미널을 열고:

```bash
# dashboard/frontend 디렉토리로 이동
cd dashboard/frontend

# 패키지 설치
npm install

# 개발 서버 실행
npm run dev
```

프론트엔드가 **http://localhost:3000**에서 실행됩니다.

---

## 📱 주요 기능

### 1. 홈 대시보드
- 전처리 데이터 및 라벨링 데이터 현황 확인
- 인수 기준 안내
- 검수 프로세스 가이드

### 2. 자동 품질 검사
- **전처리 데이터 검수**
  - 결측률, 중복률 자동 계산
  - 필수 필드 포함 여부 확인
  - 이상치 비율 분석
  - 인수 기준 자동 판정

- **라벨링 데이터 검수**
  - 라벨 분포 시각화
  - 라벨 누락률 계산
  - 광고/허위정보/유사질문 통계

### 3. 무작위 샘플링
- 설정 가능한 샘플 크기
- 1차/2차 검수 구분
- 재현 가능한 랜덤 시드
- 샘플 데이터 CSV 다운로드

### 4. 수동 검수 인터페이스
- 항목별 적합/부적합 판정
- 검수 의견 작성 기능
- 실시간 진행률 표시
- 합격률 자동 계산
- 네비게이션 및 결과 저장

### 5. 종합 리포트
- 전처리/라벨링 데이터 검수 결과
- 샘플 검수 이력 및 통계
- 리포트 다운로드 (TXT)
- 최종 검수 의견 작성

---

## 🔧 API 엔드포인트

### 데이터 관련
- `GET /api/data/summary` - 데이터 요약
- `GET /api/data/metrics/{data_type}` - 품질 지표 조회

### 샘플링 관련
- `GET /api/sampling/create` - 샘플 생성

### 검수 관련
- `GET /api/inspection/sessions` - 검수 세션 목록
- `POST /api/inspection/save` - 검수 결과 저장
- `GET /api/inspection/result/{session_id}` - 검수 결과 조회

### 리포트 관련
- `GET /api/report/summary` - 종합 리포트

자세한 API 문서는 백엔드 실행 후 **http://localhost:8000/docs**에서 확인할 수 있습니다.

---

## 📁 데이터 경로

검수할 데이터는 다음 경로에 위치해야 합니다:

```
text_labeling_ai_model/
├── dashboard/
└── data/
    └── final/
        ├── preprocessed_data.csv  # 전처리 데이터
        └── labeled_data.csv       # 라벨링 데이터
```

검수 결과는 `inspection_results/` 디렉토리에 저장됩니다.

---

## 🎨 기술 스택

### 백엔드
- **FastAPI** - 고성능 Python 웹 프레임워크
- **Pandas** - 데이터 처리 및 분석
- **Uvicorn** - ASGI 서버

### 프론트엔드
- **React 18** - UI 라이브러리
- **React Router** - 라우팅
- **Axios** - HTTP 클라이언트
- **Vite** - 빌드 도구
- **Lucide React** - 아이콘

---

## 🔍 검수 프로세스

### 1단계: 자동 품질 검사
1. 좌측 메뉴에서 "전처리 검수" 또는 "라벨링 검수" 선택
2. 자동으로 계산된 품질 지표 확인
3. 인수 기준 충족 여부 판정

### 2단계: 샘플 검수
1. "샘플링" 메뉴 선택
2. 데이터 타입, 샘플 크기, 검수 차수 설정
3. "샘플링 실행" 버튼 클릭
4. "검수 시작하기" 버튼으로 검수 페이지 이동

### 3단계: 수동 검수 수행
1. 각 항목의 질문/답변 내용 확인
2. "적합" 또는 "부적합" 판정
3. 필요시 검수 의견 작성
4. 모든 항목 검수 후 "검수 결과 저장"

### 4단계: 리포트 생성
1. "리포트" 메뉴 선택
2. 전체 검수 결과 확인
3. 필요시 리포트 다운로드
4. 최종 검수 의견 작성 및 제출

---

## 📊 주요 화면

### 홈 대시보드
![홈 화면](docs/screenshots/home.png)

### 품질 검사
![품질 검사](docs/screenshots/quality-check.png)

### 샘플링
![샘플링](docs/screenshots/sampling.png)

### 검수 인터페이스
![검수 화면](docs/screenshots/inspection.png)

### 리포트
![리포트](docs/screenshots/report.png)

---

## ⚠️ 주의사항

1. **데이터 경로**: 백엔드 실행 전 데이터 파일 경로를 확인하세요.
2. **포트 충돌**: 8000번(백엔드), 3000번(프론트엔드) 포트가 사용 중이면 변경하세요.
3. **CORS 설정**: 프론트엔드 URL이 변경되면 backend/main.py의 CORS 설정을 수정하세요.
4. **검수 결과 백업**: 중요한 검수 결과는 정기적으로 백업하세요.

---

## 🐛 문제 해결

### 백엔드 실행 오류
```bash
# 패키지 재설치
pip install --upgrade -r requirements.txt

# 데이터 경로 확인
ls ../data/final/
```

### 프론트엔드 실행 오류
```bash
# node_modules 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install

# 캐시 클리어
npm run build -- --force
```

### API 연결 오류
- 백엔드가 실행 중인지 확인
- 브라우저 콘솔에서 네트워크 탭 확인
- CORS 설정 확인

---

## 📝 라이선스

이 프로젝트는 내부 사용을 위한 프로젝트입니다.

---

## 👥 개발자

- 검수 대시보드 시스템 v1.0.0
- 문의: [이메일 주소]

---

## 📚 참고 자료

- [FastAPI 공식 문서](https://fastapi.tiangolo.com/)
- [React 공식 문서](https://react.dev/)
- [Vite 공식 문서](https://vitejs.dev/)
