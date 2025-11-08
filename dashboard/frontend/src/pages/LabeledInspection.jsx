import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { CheckCircle, XCircle, AlertTriangle, Tag } from 'lucide-react'

function LabeledInspection() {
  const navigate = useNavigate()
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMetrics()
  }, [])

  const loadMetrics = async () => {
    try {
      const response = await api.getQualityMetrics('labeled')
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
        <h1 className="page-title">라벨링 데이터셋 검수</h1>
        <p className="page-description">
          라벨링 품질 검사 및 인수 기준 충족 여부 확인
        </p>
      </div>

      {/* 기본 통계 */}
      <div className="card">
        <h2 className="card-title">라벨링 통계</h2>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-label">총 라벨링 수</div>
            <div className="metric-value">
              {metrics.total_records.toLocaleString()}
              <span className="metric-unit">건</span>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">광고</div>
            <div className="metric-value">
              {metrics.ad_count.toLocaleString()}
              <span className="metric-unit">건</span>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">허위정보</div>
            <div className="metric-value">
              {metrics.fake_count.toLocaleString()}
              <span className="metric-unit">건</span>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">유사 질문</div>
            <div className="metric-value">
              {metrics.similar_count.toLocaleString()}
              <span className="metric-unit">건</span>
            </div>
          </div>
        </div>
      </div>

      {/* 라벨 분포 */}
      <div className="card">
        <h2 className="card-title">라벨 분포</h2>
        <div className="grid-2">
          <div>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--gray-700)' }}>
              광고 비율
            </h3>
            <div style={{
              height: '30px',
              background: 'var(--gray-200)',
              borderRadius: '0.5rem',
              overflow: 'hidden',
              position: 'relative'
            }}>
              <div style={{
                height: '100%',
                width: `${(metrics.ad_count / metrics.total_records) * 100}%`,
                background: 'linear-gradient(90deg, #ef4444, #dc2626)',
                transition: 'width 0.5s'
              }}></div>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontWeight: '600',
                fontSize: '0.875rem'
              }}>
                {((metrics.ad_count / metrics.total_records) * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--gray-700)' }}>
              허위정보 비율
            </h3>
            <div style={{
              height: '30px',
              background: 'var(--gray-200)',
              borderRadius: '0.5rem',
              overflow: 'hidden',
              position: 'relative'
            }}>
              <div style={{
                height: '100%',
                width: `${(metrics.fake_count / metrics.total_records) * 100}%`,
                background: 'linear-gradient(90deg, #f59e0b, #d97706)',
                transition: 'width 0.5s'
              }}></div>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontWeight: '600',
                fontSize: '0.875rem'
              }}>
                {((metrics.fake_count / metrics.total_records) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 인수 기준 판정 */}
      <div className="card">
        <h2 className="card-title">인수 기준 판정</h2>

        {metrics.all_passed ? (
          <div className="alert alert-info">
            <CheckCircle size={20} style={{ marginRight: '8px', display: 'inline' }} />
            <strong>기본 기준을 충족합니다.</strong> 최종검수 일치율은 샘플 검수를 통해 확인하세요.
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

        <div className="alert alert-warning" style={{ marginTop: '1rem' }}>
          <strong>참고:</strong> 최종검수 일치율 90% 이상 기준은 샘플 검수를 통해 확인됩니다.
        </div>
      </div>

      {/* 샘플 검수 시작 버튼 */}
      <div className="card">
        <h2 className="card-title">다음 단계: 샘플 검수</h2>
        <p style={{ color: 'var(--gray-600)', marginBottom: '1rem' }}>
          라벨링 품질 검사를 완료했습니다. 무작위 샘플링을 통한 수동 검수를 진행하여 라벨링 정확성을 확인하세요.
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

export default LabeledInspection
