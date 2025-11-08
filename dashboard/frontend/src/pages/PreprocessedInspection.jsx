import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

function PreprocessedInspection() {
  const navigate = useNavigate()
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMetrics()
  }, [])

  const loadMetrics = async () => {
    try {
      const response = await api.getQualityMetrics('preprocessed')
      setMetrics(response.data)
    } catch (error) {
      console.error('지표 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="alert alert-danger">
        데이터를 로드할 수 없습니다.
      </div>
    )
  }

  const renderJudgment = (criterion) => {
    if (criterion.passed) {
      return <span className="badge badge-success"><CheckCircle size={14} style={{ marginRight: '4px' }} />통과</span>
    } else {
      return <span className="badge badge-danger"><XCircle size={14} style={{ marginRight: '4px' }} />실패</span>
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">전처리 데이터셋 검수</h1>
        <p className="page-description">
          자동 품질 검사 및 인수 기준 충족 여부 확인
        </p>
      </div>

      {/* 기본 통계 */}
      <div className="card">
        <h2 className="card-title">기본 통계</h2>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-label">총 레코드 수</div>
            <div className="metric-value">
              {metrics.total_records.toLocaleString()}
              <span className="metric-unit">건</span>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">컬럼 수</div>
            <div className="metric-value">
              {metrics.total_columns}
              <span className="metric-unit">개</span>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">최대 결측률</div>
            <div className="metric-value">
              {metrics.max_missing_rate}
              <span className="metric-unit">%</span>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">중복률</div>
            <div className="metric-value">
              {metrics.duplicate_rate}
              <span className="metric-unit">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 인수 기준 판정 */}
      <div className="card">
        <h2 className="card-title">인수 기준 판정</h2>

        {metrics.all_passed ? (
          <div className="alert alert-success">
            <CheckCircle size={20} style={{ marginRight: '8px', display: 'inline' }} />
            <strong>모든 기준을 충족합니다!</strong>
          </div>
        ) : (
          <div className="alert alert-danger">
            <AlertTriangle size={20} style={{ marginRight: '8px', display: 'inline' }} />
            <strong>일부 기준을 충족하지 못했습니다.</strong>
          </div>
        )}

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>기준</th>
                <th>현재 값</th>
                <th>기준 값</th>
                <th>판정</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(metrics.criteria).map(([key, criterion]) => (
                <tr key={key}>
                  <td>{criterion.description}</td>
                  <td>
                    <strong>{criterion.value.toLocaleString()}</strong>
                    {key === 'record_count' ? '건' : '%'}
                  </td>
                  <td>
                    {key === 'record_count' ? '≥' : '≤'} {criterion.threshold.toLocaleString()}
                    {key === 'record_count' ? '건' : '%'}
                  </td>
                  <td>{renderJudgment(criterion)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 컬럼별 결측률 */}
      <div className="card">
        <h2 className="card-title">컬럼별 결측률</h2>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>컬럼명</th>
                <th>결측률</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(metrics.missing_rates).map(([column, rate]) => (
                <tr key={column}>
                  <td>{column}</td>
                  <td>{rate.toFixed(2)}%</td>
                  <td>
                    {rate <= 5 ? (
                      <span className="badge badge-success">양호</span>
                    ) : (
                      <span className="badge badge-danger">기준 초과</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 샘플 검수 시작 버튼 */}
      <div className="card">
        <h2 className="card-title">다음 단계: 샘플 검수</h2>
        <p style={{ color: 'var(--gray-600)', marginBottom: '1rem' }}>
          자동 품질 검사를 완료했습니다. 무작위 샘플링을 통한 수동 검수를 진행하세요.
        </p>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/sampling')}
        >
          샘플 검수 시작하기
        </button>
      </div>
    </div>
  )
}

export default PreprocessedInspection
