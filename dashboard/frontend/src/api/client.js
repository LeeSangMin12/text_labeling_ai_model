import axios from 'axios'

// Docker 환경에서는 nginx 프록시를 통해 /api 요청이 전달됨
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const api = {
  // 데이터 요약
  getDataSummary: () => apiClient.get('/api/data/summary'),

  // 품질 지표
  getQualityMetrics: (dataType) => apiClient.get(`/api/data/metrics/${dataType}`),

  // 샘플링
  createSample: (params) => apiClient.get('/api/sampling/create', { params }),

  // 검수 세션
  getInspectionSessions: () => apiClient.get('/api/inspection/sessions'),

  // 세션 데이터 로드
  getInspectionSession: (sessionId) => apiClient.get(`/api/inspection/session/${sessionId}`),

  // 검수 결과 저장
  saveInspectionResult: (data) => apiClient.post('/api/inspection/save', data),

  // 검수 결과 조회
  getInspectionResult: (sessionId) => apiClient.get(`/api/inspection/result/${sessionId}`),

  // 리포트
  getReportSummary: () => apiClient.get('/api/report/summary'),

  // AI 배치 검수
  batchInspect: (data) => apiClient.post('/api/ai/batch-inspect', data),
}

export default apiClient
