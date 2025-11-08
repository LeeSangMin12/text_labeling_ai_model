import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { CheckCircle, XCircle, ChevronLeft, ChevronRight, Save, AlertCircle } from 'lucide-react'

function InspectionPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [sampleData, setSampleData] = useState([])
  const [similarItems, setSimilarItems] = useState({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [inspections, setInspections] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSession()
  }, [sessionId])

  const loadSession = async () => {
    try {
      const response = await api.getInspectionSession(sessionId)

      setSampleData(response.data.sample_data)
      setSimilarItems(response.data.similar_items || {})

      const initialInspections = response.data.sample_data.map((item, idx) => {
        const similarityChecks = []
        if (item.similar_items_info) {
          item.similar_items_info.forEach(simInfo => {
            similarityChecks.push({
              similar_id: simInfo.similar_id,
              similarity_score: simInfo.similarity_score,
              is_similar: null
            })
          })
        }

        return {
          id: item.id || idx,
          status: 'pending',
          comment: '',
          inspector: '',
          similarity_checks: similarityChecks,
          is_ad_checked: item.is_ad === true ? true : item.is_ad === false ? false : null,
          is_fake_checked: item.is_fake === true ? true : item.is_fake === false ? false : null
        }
      })
      setInspections(initialInspections)

    } catch (error) {
      console.error('세션 로드 실패:', error)
      alert('세션을 로드할 수 없습니다.')
      navigate('/sampling')
    } finally {
      setLoading(false)
    }
  }

  const handleInspection = (status) => {
    const newInspections = [...inspections]
    newInspections[currentIndex] = {
      ...newInspections[currentIndex],
      status,
      inspector: '검수자'
    }
    setInspections(newInspections)
    if (currentIndex < sampleData.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const handleCommentChange = (comment) => {
    const newInspections = [...inspections]
    newInspections[currentIndex].comment = comment
    setInspections(newInspections)
  }

  const handleAdCheck = (isAd) => {
    const newInspections = [...inspections]
    newInspections[currentIndex].is_ad_checked = isAd
    setInspections(newInspections)
  }

  const handleFakeCheck = (isFake) => {
    const newInspections = [...inspections]
    newInspections[currentIndex].is_fake_checked = isFake
    setInspections(newInspections)
  }

  const handleSimilarityCheck = (checkIndex, isSimilar) => {
    const newInspections = [...inspections]
    const currentCheck = newInspections[currentIndex].similarity_checks[checkIndex]

    // 같은 값을 다시 클릭하면 null로 설정 (해제)
    if (currentCheck.is_similar === isSimilar) {
      currentCheck.is_similar = null
    } else {
      currentCheck.is_similar = isSimilar
    }

    setInspections(newInspections)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // 질문/답변 포함하여 저장
      const inspectionsWithData = inspections.map((inspection, idx) => ({
        ...inspection,
        question: sampleData[idx]?.question || '',
        answer: sampleData[idx]?.answer || ''
      }))

      await api.saveInspectionResult({
        session_id: sessionId,
        inspections: inspectionsWithData
      })
      alert('검수 결과가 저장되었습니다.')
      navigate('/report')
    } catch (error) {
      console.error('저장 실패:', error)
      alert('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const goToPrevious = () => currentIndex > 0 && setCurrentIndex(currentIndex - 1)
  const goToNext = () => currentIndex < sampleData.length - 1 && setCurrentIndex(currentIndex + 1)

  if (loading) return <div className="loading"><div className="spinner"></div></div>
  if (!sampleData || sampleData.length === 0) return <div className="alert alert-danger">샘플 데이터를 찾을 수 없습니다.</div>

  const currentItem = sampleData[currentIndex]
  const currentInspection = inspections[currentIndex]
  const inspectedCount = inspections.filter(i => i.status !== 'pending').length
  const passCount = inspections.filter(i => i.status === 'pass').length
  const failCount = inspections.filter(i => i.status === 'fail').length
  const progress = (inspectedCount / sampleData.length) * 100
  const isLabeled = sessionId.includes('labeled')

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">데이터 검수</h1>
        <p className="page-description">세션: {sessionId}</p>
      </div>

      {/* 진행 상황 */}
      <div className="card">
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            <span>검수 완료: {inspectedCount} / {sampleData.length}</span>
            <span>{progress.toFixed(1)}%</span>
          </div>
          <div style={{ height: '4px', background: 'var(--gray-200)', borderRadius: '2px' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--primary-color)', borderRadius: '2px' }}></div>
          </div>
        </div>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-label">검수 완료</div>
            <div className="metric-value">{inspectedCount}<span className="metric-unit">건</span></div>
          </div>
          <div className="metric-card">
            <div className="metric-label">적합</div>
            <div className="metric-value">{passCount}<span className="metric-unit">건</span></div>
          </div>
          <div className="metric-card">
            <div className="metric-label">부적합</div>
            <div className="metric-value">{failCount}<span className="metric-unit">건</span></div>
          </div>
          <div className="metric-card">
            <div className="metric-label">합격률</div>
            <div className="metric-value">{inspectedCount > 0 ? ((passCount / inspectedCount) * 100).toFixed(1) : 0}<span className="metric-unit">%</span></div>
          </div>
        </div>
      </div>

      {/* 검수 항목 */}
      <div className="card">
        <h2 className="card-title">항목 #{currentIndex + 1}</h2>

        {/* 현재 데이터 */}
        <div style={{ background: 'var(--gray-50)', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--gray-200)' }}>
          {['question', 'answer'].map(key => (
            currentItem[key] && (
              <div key={key} style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>
                  {key === 'question' ? '질문' : '답변'}
                </div>
                <div style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {String(currentItem[key])}
                </div>
              </div>
            )
          ))}
        </div>

        {/* 광고/허위정보 체크 */}
        {isLabeled && (
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--gray-50)', border: '1px solid var(--gray-200)' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.75rem' }}>라벨 검수</div>
            <div style={{ display: 'flex', gap: '2rem' }}>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  className="checkbox-input"
                  checked={currentInspection.is_ad_checked === true}
                  onChange={(e) => handleAdCheck(e.target.checked)}
                />
                광고
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  className="checkbox-input"
                  checked={currentInspection.is_fake_checked === true}
                  onChange={(e) => handleFakeCheck(e.target.checked)}
                />
                허위정보
              </label>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '0.5rem' }}>
              원본: 광고={String(currentItem.is_ad)}, 허위정보={String(currentItem.is_fake)}
            </div>
          </div>
        )}

        {/* 유사 항목 */}
        {isLabeled && currentItem.similar_items_info && currentItem.similar_items_info.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.75rem' }}>유사 항목 검수 ({currentItem.similar_items_info.length}개)</div>
            {currentItem.similar_items_info.map((simInfo, idx) => {
              const similarItem = similarItems[simInfo.similar_id]
              const similarityCheck = currentInspection.similarity_checks?.[idx]

              return (
                <div key={idx} style={{ background: 'var(--gray-50)', padding: '1rem', marginBottom: '0.75rem', border: '1px solid var(--gray-200)' }}>
                  <div style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: '600' }}>유사 항목 #{idx + 1}</span>
                    <span style={{ marginLeft: '0.5rem', color: 'var(--gray-500)' }}>유사도: {(simInfo.similarity_score * 100).toFixed(1)}%</span>
                  </div>
                  {similarItem && (
                    <>
                      <div style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                        <div style={{ color: 'var(--gray-600)' }}>질문:</div>
                        <div>{similarItem.question}</div>
                      </div>
                      <div style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                        <div style={{ color: 'var(--gray-600)' }}>답변:</div>
                        <div>{similarItem.answer}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '1.5rem' }}>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            className="checkbox-input"
                            checked={similarityCheck?.is_similar === true}
                            onChange={() => handleSimilarityCheck(idx, true)}
                          />
                          유사함
                        </label>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            className="checkbox-input"
                            checked={similarityCheck?.is_similar === false}
                            onChange={() => handleSimilarityCheck(idx, false)}
                          />
                          유사하지 않음
                        </label>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* 검수 의견 */}
        <div className="form-group">
          <label className="form-label">검수 의견</label>
          <textarea
            className="form-input"
            rows="3"
            placeholder="검수 의견을 입력하세요..."
            value={currentInspection.comment}
            onChange={(e) => handleCommentChange(e.target.value)}
          />
        </div>

        {/* 검수 버튼 */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-success" onClick={() => handleInspection('pass')} style={{ flex: 1 }}>
            <CheckCircle size={16} />적합
          </button>
          <button className="btn btn-danger" onClick={() => handleInspection('fail')} style={{ flex: 1 }}>
            <XCircle size={16} />부적합
          </button>
        </div>
      </div>

      {/* 네비게이션 */}
      <div className="card">
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={goToPrevious} disabled={currentIndex === 0} style={{ flex: 1 }}>
            <ChevronLeft size={16} />이전
          </button>
          <button className="btn btn-secondary" onClick={goToNext} disabled={currentIndex === sampleData.length - 1} style={{ flex: 1 }}>
            다음<ChevronRight size={16} />
          </button>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving || inspectedCount === 0} style={{ width: '100%' }}>
          {saving ? '저장 중...' : <><Save size={16} />검수 결과 저장</>}
        </button>
      </div>
    </div>
  )
}

export default InspectionPage
