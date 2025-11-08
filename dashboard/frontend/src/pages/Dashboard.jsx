import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { FileText, Tag, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

function Dashboard() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSummary()
  }, [])

  const loadSummary = async () => {
    try {
      const response = await api.getDataSummary()
      setSummary(response.data)
    } catch (error) {
      console.error('데이터 로드 실패:', error)
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

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">데이터셋 검수 대시보드</h1>
        <p className="page-description">
          지식 공유 SNS 플랫폼 '문'의 데이터셋 검수 시스템
        </p>
      </div>

      <div className="grid-2">
        {/* 전처리 데이터 카드 */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <FileText size={24} color="#2563eb" />
            <h2 className="card-title" style={{ marginBottom: 0 }}>전처리 데이터셋</h2>
          </div>

          {summary?.preprocessed?.exists ? (
            <>
              <div className="metric-card" style={{ marginBottom: '1rem' }}>
                <div className="metric-label">총 레코드 수</div>
                <div className="metric-value">
                  {summary.preprocessed.count.toLocaleString()}
                  <span className="metric-unit">건</span>
                </div>
              </div>

              <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
                <strong>인수 기준:</strong>
                <ul style={{ marginTop: '0.5rem', marginLeft: '1.25rem' }}>
                  <li>레코드 수: 100,000건</li>
                  <li>결측률, 중복률: 5% 이하</li>
                  <li>필수필드 포함: 100%</li>
                  <li>이상치 비율: 10% 이내</li>
                </ul>
              </div>

              <button
                className="btn btn-primary"
                onClick={() => navigate('/preprocessed')}
                style={{ width: '100%' }}
              >
                검수 시작하기
              </button>
            </>
          ) : (
            <div className="alert alert-warning">
              전처리 데이터를 찾을 수 없습니다.
            </div>
          )}
        </div>

        {/* 라벨링 데이터 카드 */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <Tag size={24} color="#10b981" />
            <h2 className="card-title" style={{ marginBottom: 0 }}>라벨링 데이터셋</h2>
          </div>

          {summary?.labeled?.exists ? (
            <>
              <div className="metric-card" style={{ marginBottom: '1rem' }}>
                <div className="metric-label">총 라벨링 수</div>
                <div className="metric-value">
                  {summary.labeled.count.toLocaleString()}
                  <span className="metric-unit">건</span>
                </div>
              </div>

              <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
                <strong>인수 기준:</strong>
                <ul style={{ marginTop: '0.5rem', marginLeft: '1.25rem' }}>
                  <li>라벨링 수량: 10,000건</li>
                  <li>최종검수 일치율: 90% 이상</li>
                  <li>라벨 누락/오분류율: 3% 이하</li>
                </ul>
              </div>

              <button
                className="btn btn-primary"
                onClick={() => navigate('/labeled')}
                style={{ width: '100%' }}
              >
                검수 시작하기
              </button>
            </>
          ) : (
            <div className="alert alert-warning">
              라벨링 데이터를 찾을 수 없습니다.
            </div>
          )}
        </div>
      </div>

      {/* 검수 프로세스 안내 */}
      <div className="card">
        <h2 className="card-title">검수 프로세스</h2>
        <div className="grid-3">
          <div style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem'
            }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2563eb' }}>1</span>
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
              데이터 품질 확인
            </h3>
            <p style={{ color: 'var(--gray-600)', fontSize: '0.9rem' }}>
              결측률, 중복률, 필수 필드 등 자동 품질 검사
            </p>
          </div>

          <div style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem'
            }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2563eb' }}>2</span>
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
              샘플 검수
            </h3>
            <p style={{ color: 'var(--gray-600)', fontSize: '0.9rem' }}>
              무작위 샘플링을 통한 수동 검수 (1차/2차)
            </p>
          </div>

          <div style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem'
            }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2563eb' }}>3</span>
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
              리포트 생성
            </h3>
            <p style={{ color: 'var(--gray-600)', fontSize: '0.9rem' }}>
              검수 결과 종합 리포트 생성 및 다운로드
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
