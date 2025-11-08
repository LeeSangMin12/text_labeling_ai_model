# 빠른 시작 가이드

검수 대시보드를 빠르게 실행하는 방법입니다.

## 1️⃣ 백엔드 실행 (터미널 1)

```bash
# 프로젝트 루트에서
cd dashboard/backend

# 의존성 설치
pip install -r requirements.txt

# 서버 실행
python main.py
```

✅ **성공 메시지:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

## 2️⃣ 프론트엔드 실행 (터미널 2)

```bash
# 프로젝트 루트에서
cd dashboard/frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

✅ **성공 메시지:**
```
  ➜  Local:   http://localhost:3000/
```

## 3️⃣ 브라우저에서 접속

http://localhost:3000 을 브라우저에서 열기

## 🎯 검수 시작하기

1. **홈 화면**에서 데이터 현황 확인
2. **전처리 검수** 또는 **라벨링 검수** 메뉴 선택
3. 자동 품질 검사 결과 확인
4. **샘플링** 메뉴에서 검수용 샘플 생성
5. **검수 시작하기** 버튼 클릭
6. 각 항목 검수 후 저장
7. **리포트** 메뉴에서 결과 확인

## 🔧 문제 해결

### 포트가 이미 사용 중인 경우

**백엔드 (8000번 포트):**
```python
# backend/main.py 마지막 줄 수정
uvicorn.run(app, host="0.0.0.0", port=8001)  # 포트 변경
```

**프론트엔드 (3000번 포트):**
```javascript
// frontend/vite.config.js 수정
export default defineConfig({
  server: {
    port: 3001,  // 포트 변경
  }
})
```

### 데이터를 찾을 수 없는 경우

데이터 경로 확인:
```
text_labeling_ai_model/
└── data/
    └── final/
        ├── preprocessed_data.csv
        └── labeled_data.csv
```

없다면 상위 디렉토리로 이동하거나 `backend/main.py`의 경로 수정

## ❓ 추가 도움이 필요하신가요?

전체 문서는 `README.md`를 참조하세요.
