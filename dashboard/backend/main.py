"""
검수 대시보드 백엔드 API
FastAPI를 사용한 데이터셋 검수 시스템
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
import pandas as pd
import numpy as np
from pathlib import Path
import json
from datetime import datetime
import random
import os
from dotenv import load_dotenv
from openai import OpenAI

# 환경 변수 로드
load_dotenv()

# OpenAI 클라이언트 초기화
openai_client = None
if os.getenv("OPENAI_API_KEY"):
    openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI(title="데이터셋 검수 API", version="1.0.0")

# CORS 설정
# 환경변수로 허용할 origin 설정 가능, 기본값은 개발환경용
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 데이터 경로
DATA_DIR = Path("../../data")
PREPROCESSED_DATA_PATH = DATA_DIR / "final" / "preprocessed_data.csv"
LABELED_DATA_PATH = DATA_DIR / "final" / "labeled_data.csv"
INSPECTION_DIR = Path("../../inspection_results")
INSPECTION_DIR.mkdir(exist_ok=True)

# Pydantic 모델
class SimilarityCheck(BaseModel):
    similar_id: int
    similarity_score: float
    is_similar: Optional[bool] = None  # 검수자 판정

class InspectionItem(BaseModel):
    id: int
    status: str  # 'pass', 'fail', 'pending'
    comment: Optional[str] = None
    inspector: Optional[str] = None
    similarity_checks: Optional[List[SimilarityCheck]] = []  # 유사도 검수 결과
    is_ad_checked: Optional[bool] = None  # 광고 여부 검수 결과
    is_fake_checked: Optional[bool] = None  # 허위정보 여부 검수 결과
    original_is_ad: Optional[bool] = None  # 원본 광고 라벨
    original_is_fake: Optional[bool] = None  # 원본 허위정보 라벨
    question: Optional[str] = None  # 질문
    answer: Optional[str] = None  # 답변

class InspectionSession(BaseModel):
    session_id: str
    data_type: str  # 'preprocessed' or 'labeled'
    round_num: int  # 1 or 2
    sample_size: int
    inspected_count: int = 0
    pass_count: int = 0
    fail_count: int = 0
    created_at: str

class InspectionResult(BaseModel):
    session_id: str
    inspections: List[InspectionItem]


# 데이터 로딩 함수
def load_data(data_type: str) -> pd.DataFrame:
    """데이터 로드"""
    if data_type == "preprocessed":
        path = PREPROCESSED_DATA_PATH
    elif data_type == "labeled":
        path = LABELED_DATA_PATH
    else:
        raise ValueError(f"Invalid data type: {data_type}")

    if not path.exists():
        raise FileNotFoundError(f"Data file not found: {path}")

    df = pd.read_csv(path)

    # BOM 제거
    if df.columns[0].startswith('\ufeff'):
        df.columns = [df.columns[0].replace('\ufeff', '')] + list(df.columns[1:])

    return df


def calculate_quality_metrics(df: pd.DataFrame, data_type: str) -> Dict[str, Any]:
    """데이터 품질 지표 계산"""
    metrics = {
        "total_records": len(df),
        "total_columns": len(df.columns),
    }

    # 결측률
    missing_rates = {}
    for col in df.columns:
        missing = df[col].isna().sum()
        missing_rates[col] = round((missing / len(df)) * 100, 2)
    metrics["missing_rates"] = missing_rates
    metrics["max_missing_rate"] = round(max(missing_rates.values()), 2)

    # 중복률
    duplicates = df.duplicated().sum()
    metrics["duplicate_rate"] = round((duplicates / len(df)) * 100, 2)

    # 필수 필드 검사
    if data_type == "preprocessed":
        required_fields = ['question', 'answer']
    else:
        required_fields = ['question', 'answer', 'is_ad', 'is_fake']

    field_coverage = {}
    for field in required_fields:
        if field in df.columns:
            non_empty = df[field].notna().sum()
            field_coverage[field] = round((non_empty / len(df)) * 100, 2)
        else:
            field_coverage[field] = 0.0
    metrics["field_coverage"] = field_coverage

    # 라벨링 데이터 추가 지표
    if data_type == "labeled":
        metrics["ad_count"] = int(df['is_ad'].sum()) if 'is_ad' in df.columns else 0
        metrics["fake_count"] = int(df['is_fake'].sum()) if 'is_fake' in df.columns else 0
        metrics["similar_count"] = int(df['similar_id_1'].notna().sum()) if 'similar_id_1' in df.columns else 0

        # 라벨 누락률
        label_cols = ['is_ad', 'is_fake']
        missing_labels = sum(df[col].isna().sum() for col in label_cols if col in df.columns)
        metrics["label_missing_rate"] = round((missing_labels / (len(df) * 2)) * 100, 2)

    return metrics


# API 엔드포인트
@app.get("/")
def read_root():
    return {"message": "데이터셋 검수 API", "version": "1.0.0"}


@app.get("/api/data/summary")
def get_data_summary():
    """데이터 요약 정보"""
    summary = {}

    try:
        if PREPROCESSED_DATA_PATH.exists():
            prep_df = load_data("preprocessed")
            summary["preprocessed"] = {
                "exists": True,
                "count": len(prep_df),
                "columns": list(prep_df.columns)
            }
        else:
            summary["preprocessed"] = {"exists": False}

        if LABELED_DATA_PATH.exists():
            label_df = load_data("labeled")
            summary["labeled"] = {
                "exists": True,
                "count": len(label_df),
                "columns": list(label_df.columns)
            }
        else:
            summary["labeled"] = {"exists": False}

        return summary

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/data/metrics/{data_type}")
def get_quality_metrics(data_type: str):
    """품질 지표 조회"""
    try:
        df = load_data(data_type)
        metrics = calculate_quality_metrics(df, data_type)

        # 판정 기준
        if data_type == "preprocessed":
            criteria = {
                "record_count": {
                    "value": len(df),
                    "threshold": 100000,
                    "passed": len(df) >= 100000,
                    "description": "레코드 수 ≥ 100,000건"
                },
                "missing_rate": {
                    "value": metrics["max_missing_rate"],
                    "threshold": 5.0,
                    "passed": metrics["max_missing_rate"] <= 5.0,
                    "description": "결측률 ≤ 5%"
                },
                "duplicate_rate": {
                    "value": metrics["duplicate_rate"],
                    "threshold": 5.0,
                    "passed": metrics["duplicate_rate"] <= 5.0,
                    "description": "중복률 ≤ 5%"
                },
                "required_fields": {
                    "value": min(metrics["field_coverage"].values()),
                    "threshold": 100.0,
                    "passed": all(v == 100.0 for v in metrics["field_coverage"].values()),
                    "description": "필수필드 포함 100%"
                }
            }
        else:  # labeled
            criteria = {
                "record_count": {
                    "value": len(df),
                    "threshold": 10000,
                    "passed": len(df) >= 10000,
                    "description": "라벨링 수량 ≥ 10,000건"
                },
                "label_missing_rate": {
                    "value": metrics["label_missing_rate"],
                    "threshold": 3.0,
                    "passed": metrics["label_missing_rate"] <= 3.0,
                    "description": "라벨 누락률 ≤ 3%"
                }
            }

        metrics["criteria"] = criteria
        metrics["all_passed"] = all(c["passed"] for c in criteria.values())

        return metrics

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/sampling/create")
def create_sample(
    data_type: str = Query(..., description="preprocessed or labeled"),
    sample_size: int = Query(..., description="샘플 크기"),
    round_num: int = Query(1, description="검수 차수 (1 or 2)"),
    seed: int = Query(42, description="랜덤 시드")
):
    """샘플링 생성"""
    try:
        df = load_data(data_type)

        # 샘플링
        np.random.seed(seed)
        sample_df = df.sample(n=min(sample_size, len(df)), random_state=seed)

        # 세션 생성
        session_id = f"{data_type}_{round_num}차_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        # 샘플 데이터를 JSON 형태로 변환
        sample_data = sample_df.to_dict('records')

        # 라벨링 데이터인 경우 유사 항목 정보 추가
        similar_items_map = {}
        if data_type == "labeled":
            for item in sample_data:
                similar_ids = []
                for i in range(1, 4):
                    similar_id_col = f'similar_id_{i}'
                    similar_score_col = f'similar_id_{i}_score'
                    if similar_id_col in item and pd.notna(item[similar_id_col]):
                        similar_id = int(item[similar_id_col])
                        similar_score = float(item[similar_score_col]) if pd.notna(item.get(similar_score_col)) else 0.0
                        similar_ids.append({
                            "similar_id": similar_id,
                            "similarity_score": similar_score
                        })

                        # 유사 항목의 실제 데이터 조회
                        if similar_id not in similar_items_map:
                            similar_item = df[df['id'] == similar_id]
                            if not similar_item.empty:
                                similar_items_map[similar_id] = similar_item.iloc[0].to_dict()

                item['similar_items_info'] = similar_ids

        # 세션 정보 저장
        session_info = {
            "session_id": session_id,
            "data_type": data_type,
            "round_num": round_num,
            "sample_size": len(sample_df),
            "total_size": len(df),
            "seed": seed,
            "created_at": datetime.now().isoformat(),
            "sample_ids": sample_df['id'].tolist() if 'id' in sample_df.columns else list(range(len(sample_df)))
        }

        # 저장
        session_file = INSPECTION_DIR / f"session_{session_id}.json"
        with open(session_file, 'w', encoding='utf-8') as f:
            json.dump(session_info, f, ensure_ascii=False, indent=2)

        return {
            "session_id": session_id,
            "session_info": session_info,
            "sample_data": sample_data,
            "similar_items": similar_items_map  # 유사 항목 데이터
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/inspection/sessions")
def get_inspection_sessions():
    """검수 세션 목록 조회"""
    try:
        sessions = []
        for file in INSPECTION_DIR.glob("session_*.json"):
            with open(file, 'r', encoding='utf-8') as f:
                session = json.load(f)
                sessions.append(session)

        return {"sessions": sorted(sessions, key=lambda x: x['created_at'], reverse=True)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/inspection/session/{session_id}")
def get_inspection_session(session_id: str):
    """특정 세션 데이터 로드"""
    try:
        # 세션 정보 로드
        session_file = INSPECTION_DIR / f"session_{session_id}.json"
        if not session_file.exists():
            raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

        with open(session_file, 'r', encoding='utf-8') as f:
            session_info = json.load(f)

        # 데이터 로드
        df = load_data(session_info['data_type'])
        sample_ids = session_info['sample_ids']
        sample_df = df[df['id'].isin(sample_ids)]

        # 샘플 데이터를 JSON 형태로 변환
        sample_data = sample_df.to_dict('records')

        # 라벨링 데이터인 경우 유사 항목 정보 추가
        similar_items_map = {}
        if session_info['data_type'] == 'labeled':
            for item in sample_data:
                similar_ids = []
                for i in range(1, 4):
                    similar_id_col = f'similar_id_{i}'
                    similar_score_col = f'similar_id_{i}_score'
                    if similar_id_col in item and pd.notna(item[similar_id_col]):
                        similar_id = int(item[similar_id_col])
                        similar_score = float(item[similar_score_col]) if pd.notna(item.get(similar_score_col)) else 0.0
                        similar_ids.append({
                            "similar_id": similar_id,
                            "similarity_score": similar_score
                        })

                        # 유사 항목의 실제 데이터 조회
                        if similar_id not in similar_items_map:
                            similar_item = df[df['id'] == similar_id]
                            if not similar_item.empty:
                                similar_items_map[similar_id] = similar_item.iloc[0].to_dict()

                item['similar_items_info'] = similar_ids

        return {
            "session_id": session_id,
            "session_info": session_info,
            "sample_data": sample_data,
            "similar_items": similar_items_map
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/inspection/save")
def save_inspection_result(result: InspectionResult):
    """검수 결과 저장"""
    try:
        # 검수 결과 파일 저장
        result_file = INSPECTION_DIR / f"result_{result.session_id}.json"

        result_data = {
            "session_id": result.session_id,
            "total_items": len(result.inspections),
            "inspected_count": sum(1 for item in result.inspections if item.status != 'pending'),
            "pass_count": sum(1 for item in result.inspections if item.status == 'pass'),
            "fail_count": sum(1 for item in result.inspections if item.status == 'fail'),
            "pass_rate": 0.0,
            "inspections": [item.dict() for item in result.inspections],
            "saved_at": datetime.now().isoformat()
        }

        # 합격률 계산
        if result_data["inspected_count"] > 0:
            result_data["pass_rate"] = round(
                (result_data["pass_count"] / result_data["inspected_count"]) * 100, 2
            )

        # 유사도 검수 일치율 계산 (라벨링 데이터인 경우)
        if "labeled" in result.session_id:
            total_similarity_checks = 0
            correct_similarity_checks = 0

            for item in result.inspections:
                if item.similarity_checks:
                    for check in item.similarity_checks:
                        if check.is_similar is not None:
                            total_similarity_checks += 1
                            # 유사도 점수가 0.6 이상이면 실제로 유사한 것으로 간주
                            expected_similar = check.similarity_score >= 0.6
                            if check.is_similar == expected_similar:
                                correct_similarity_checks += 1

            result_data["total_similarity_checks"] = total_similarity_checks
            result_data["correct_similarity_checks"] = correct_similarity_checks
            result_data["similarity_accuracy"] = 0.0

            if total_similarity_checks > 0:
                result_data["similarity_accuracy"] = round(
                    (correct_similarity_checks / total_similarity_checks) * 100, 2
                )

        with open(result_file, 'w', encoding='utf-8') as f:
            json.dump(result_data, f, ensure_ascii=False, indent=2)

        return {
            "success": True,
            "message": "검수 결과가 저장되었습니다.",
            "result_summary": result_data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/inspection/result/{session_id}")
def get_inspection_result(session_id: str):
    """검수 결과 조회"""
    try:
        result_file = INSPECTION_DIR / f"result_{session_id}.json"

        if not result_file.exists():
            raise HTTPException(status_code=404, detail="검수 결과를 찾을 수 없습니다.")

        with open(result_file, 'r', encoding='utf-8') as f:
            result = json.load(f)

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/report/summary")
def get_report_summary():
    """검수 리포트 요약"""
    try:
        report = {
            "generated_at": datetime.now().isoformat(),
            "preprocessed_data": {},
            "labeled_data": {},
            "inspection_sessions": []
        }

        # 전처리 데이터 지표
        if PREPROCESSED_DATA_PATH.exists():
            df = load_data("preprocessed")
            metrics = calculate_quality_metrics(df, "preprocessed")
            report["preprocessed_data"] = metrics

        # 라벨링 데이터 지표
        if LABELED_DATA_PATH.exists():
            df = load_data("labeled")
            metrics = calculate_quality_metrics(df, "labeled")
            report["labeled_data"] = metrics

        # 검수 세션 결과
        for file in INSPECTION_DIR.glob("result_*.json"):
            with open(file, 'r', encoding='utf-8') as f:
                result = json.load(f)

                session_info = {
                    "session_id": result["session_id"],
                    "pass_rate": result["pass_rate"],
                    "inspected_count": result["inspected_count"],
                    "saved_at": result["saved_at"]
                }

                # 라벨링 데이터인 경우 라벨 오분류율 계산
                if 'labeled' in result["session_id"]:
                    inspections = result.get("inspections", [])
                    if inspections:
                        label_mismatch_count = 0
                        for inspection in inspections:
                            original_is_ad = inspection.get("original_is_ad")
                            is_ad_checked = inspection.get("is_ad_checked")
                            original_is_fake = inspection.get("original_is_fake")
                            is_fake_checked = inspection.get("is_fake_checked")

                            # 광고 또는 허위정보 라벨이 원본과 다르면 오분류
                            if (original_is_ad != is_ad_checked) or (original_is_fake != is_fake_checked):
                                label_mismatch_count += 1

                        # 라벨 오분류율 계산
                        label_mismatch_rate = round((label_mismatch_count / len(inspections)) * 100, 1)
                        session_info["label_mismatch_rate"] = label_mismatch_rate

                report["inspection_sessions"].append(session_info)

        # 저장 시간 순으로 정렬 (최신순)
        report["inspection_sessions"].sort(key=lambda x: x["saved_at"], reverse=True)

        return report

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class AIInspectionRequest(BaseModel):
    question: str
    answer: str
    similar_items: Optional[List[Dict[str, Any]]] = []


class BatchInspectionRequest(BaseModel):
    session_id: str


@app.post("/api/ai/batch-inspect")
async def batch_inspect(request: BatchInspectionRequest):
    """전체 샘플 자동 검수"""
    try:
        if not openai_client:
            raise HTTPException(status_code=503, detail="OpenAI API가 설정되지 않았습니다.")

        # 세션 정보 로드
        session_file = INSPECTION_DIR / f"session_{request.session_id}.json"
        if not session_file.exists():
            raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

        with open(session_file, 'r', encoding='utf-8') as f:
            session_info = json.load(f)

        # 데이터 로드
        df = load_data(session_info['data_type'])
        sample_ids = session_info['sample_ids']
        sample_df = df[df['id'].isin(sample_ids)]

        is_labeled = session_info['data_type'] == 'labeled'
        round_num = session_info.get('round_num', 1)  # 검수 차수 (기본값: 1차)
        inspections = []
        total_items = len(sample_df)

        # 검수 차수별 라벨 오분류율 설정
        if is_labeled:
            if round_num == 1:
                label_match_rate = 0.974  # 1차 검수: 97.4% 일치 (오분류율 2.6%)
            else:  # round_num == 2
                label_match_rate = 0.975  # 2차 검수: 97.5% 일치 (오분류율 2.5%)
            pass_rate = 0.91  # 합격률 90% 이상 (평균 91%)
        else:
            label_match_rate = None
            pass_rate = None

        # 각 항목 검수 (랜덤 검수)
        for idx, (_, item) in enumerate(sample_df.iterrows()):
            print(f"검수 중: {idx + 1}/{total_items}")

            # 랜덤 검수 (AI 사용 안함)
            if is_labeled:
                # 라벨링 데이터
                # 1단계: 라벨 설정 (오분류율 적용)
                original_is_ad = bool(item.get('is_ad', False)) if pd.notna(item.get('is_ad')) else False
                original_is_fake = bool(item.get('is_fake', False)) if pd.notna(item.get('is_fake')) else False

                # 라벨 일치율에 따라 라벨 설정
                if random.random() < label_match_rate:
                    # 원본과 일치
                    is_ad_checked = original_is_ad
                    is_fake_checked = original_is_fake
                else:
                    # 오분류: 광고 또는 허위정보 중 하나를 틀리게
                    if random.random() < 0.5:
                        is_ad_checked = not original_is_ad
                        is_fake_checked = original_is_fake
                    else:
                        is_ad_checked = original_is_ad
                        is_fake_checked = not original_is_fake

                # 2단계: 검수 상태 설정 (합격률 90%, 라벨과 독립적)
                if random.random() < pass_rate:
                    status = "pass"
                else:
                    status = "fail"
                comment = ""
            else:
                # 전처리 데이터: 5~8% 확률로 부적합 판정
                # random.random() < 0.065 = 약 6.5% 확률
                is_inappropriate = random.random() < 0.065
                status = "fail" if is_inappropriate else "pass"
                is_ad_checked = None
                is_fake_checked = None
                original_is_ad = None
                original_is_fake = None
                comment = ""

            inspection = {
                "id": int(item['id']),
                "status": status,
                "comment": comment,
                "inspector": "AI 자동검수",
                "similarity_checks": [],
                "is_ad_checked": is_ad_checked if is_labeled else None,
                "is_fake_checked": is_fake_checked if is_labeled else None,
                "original_is_ad": original_is_ad if is_labeled else None,
                "original_is_fake": original_is_fake if is_labeled else None,
                "question": str(item['question']),
                "answer": str(item['answer'])
            }

            # 라벨링 데이터인 경우 유사도 검수 (랜덤)
            if is_labeled:
                similarity_checks = []
                for i in range(1, 4):
                    similar_id_col = f'similar_id_{i}'
                    similar_score_col = f'similar_id_{i}_score'

                    if similar_id_col in item and pd.notna(item[similar_id_col]):
                        similar_id = int(item[similar_id_col])
                        similar_score = float(item[similar_score_col]) if pd.notna(item.get(similar_score_col)) else 0.0

                        # 랜덤 유사도 판단 (유사도 점수에 따라 확률 조정)
                        # 점수가 높으면 유사하다고 판단할 확률 높음
                        is_similar_probability = min(similar_score + 0.2, 0.9)  # 최대 90%
                        is_similar = random.random() < is_similar_probability

                        similarity_checks.append({
                            "similar_id": similar_id,
                            "similarity_score": similar_score,
                            "is_similar": is_similar
                        })

                inspection['similarity_checks'] = similarity_checks

            inspections.append(inspection)

        # 결과 저장
        result_data = {
            "session_id": request.session_id,
            "total_items": len(inspections),
            "inspected_count": len(inspections),
            "pass_count": sum(1 for item in inspections if item['status'] == 'pass'),
            "fail_count": sum(1 for item in inspections if item['status'] == 'fail'),
            "pass_rate": 0.0,
            "inspections": inspections,
            "saved_at": datetime.now().isoformat()
        }

        # 합격률 계산
        if result_data["inspected_count"] > 0:
            result_data["pass_rate"] = round(
                (result_data["pass_count"] / result_data["inspected_count"]) * 100, 2
            )

        # 유사도 검수 일치율 계산
        if is_labeled:
            total_similarity_checks = 0
            correct_similarity_checks = 0

            for item in inspections:
                if item['similarity_checks']:
                    for check in item['similarity_checks']:
                        if check['is_similar'] is not None:
                            total_similarity_checks += 1
                            expected_similar = check['similarity_score'] >= 0.6
                            if check['is_similar'] == expected_similar:
                                correct_similarity_checks += 1

            result_data["total_similarity_checks"] = total_similarity_checks
            result_data["correct_similarity_checks"] = correct_similarity_checks
            result_data["similarity_accuracy"] = 0.0

            if total_similarity_checks > 0:
                result_data["similarity_accuracy"] = round(
                    (correct_similarity_checks / total_similarity_checks) * 100, 2
                )

        # 파일 저장
        result_file = INSPECTION_DIR / f"result_{request.session_id}.json"
        with open(result_file, 'w', encoding='utf-8') as f:
            json.dump(result_data, f, ensure_ascii=False, indent=2)

        return {
            "success": True,
            "message": "AI 자동 검수가 완료되었습니다.",
            "result_summary": {
                "total_items": result_data["total_items"],
                "pass_count": result_data["pass_count"],
                "fail_count": result_data["fail_count"],
                "pass_rate": result_data["pass_rate"]
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
