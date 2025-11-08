import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Shuffle, Download, Play, Sparkles } from "lucide-react";

function Sampling() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    dataType: "preprocessed",
    sampleSize: 1000,
    roundNum: 1,
    seed: 42,
  });
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "sampleSize" || name === "roundNum" || name === "seed"
          ? parseInt(value)
          : value,
    }));
  };

  const handleSampling = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await api.createSample({
        data_type: formData.dataType,
        sample_size: formData.sampleSize,
        round_num: formData.roundNum,
        seed: formData.seed,
      });

      setResult(response.data);
    } catch (error) {
      console.error("샘플링 실패:", error);
      alert("샘플링에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleAIBatchInspect = async () => {
    if (!result || !result.session_id) return;

    const confirmed = confirm(
      `${result.session_info.sample_size}건의 데이터를 AI로 자동 검수하시겠습니까?\n\n` +
        `이 작업은 시간이 걸릴 수 있으며, OpenAI API 비용이 발생합니다.`
    );

    if (!confirmed) return;

    setAiLoading(true);
    try {
      const response = await api.batchInspect({
        session_id: result.session_id,
      });

      if (response.data.success) {
        alert(
          `AI 자동 검수가 완료되었습니다!\n\n` +
            `총 ${response.data.result_summary.total_items}건 검수\n` +
            `적합: ${response.data.result_summary.pass_count}건\n` +
            `부적합: ${response.data.result_summary.fail_count}건\n` +
            `합격률: ${response.data.result_summary.pass_rate}%`
        );
        navigate("/report");
      }
    } catch (error) {
      console.error("AI 검수 실패:", error);
      if (error.response?.status === 503) {
        alert(
          "OpenAI API 키가 설정되지 않았습니다.\n\n백엔드 디렉토리에 .env 파일을 생성하고 OPENAI_API_KEY를 추가해주세요."
        );
      } else {
        alert("AI 검수에 실패했습니다.");
      }
    } finally {
      setAiLoading(false);
    }
  };

  const downloadSampleCSV = () => {
    if (!result || !result.sample_data) return;

    // CSV 생성
    const headers = Object.keys(result.sample_data[0]);
    const csvRows = [
      headers.join(","),
      ...result.sample_data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            // CSV에서 콤마와 따옴표 처리
            if (
              typeof value === "string" &&
              (value.includes(",") ||
                value.includes('"') ||
                value.includes("\n"))
            ) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(",")
      ),
    ];

    const csvContent = "\ufeff" + csvRows.join("\n"); // BOM 추가

    // 다운로드
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sample_${result.session_id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">무작위 샘플링</h1>
        <p className="page-description">
          검수를 위한 무작위 샘플 데이터를 생성합니다.
        </p>
      </div>

      {/* 샘플링 설정 */}
      <div className="card">
        <h2 className="card-title">샘플링 설정</h2>

        <div className="form-group">
          <label className="form-label">데이터 타입</label>
          <select
            name="dataType"
            value={formData.dataType}
            onChange={handleInputChange}
            className="form-select"
          >
            <option value="preprocessed">전처리 데이터</option>
            <option value="labeled">라벨링 데이터</option>
          </select>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">샘플 크기</label>
            <input
              type="number"
              name="sampleSize"
              value={formData.sampleSize}
              onChange={handleInputChange}
              className="form-input"
              min="1"
              step="100"
            />
            <small
              style={{
                color: "var(--gray-500)",
                display: "block",
                marginTop: "0.25rem",
              }}
            >
              {formData.dataType === "preprocessed"
                ? "권장: 1,000건"
                : "권장: 500건"}
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">검수 차수</label>
            <select
              name="roundNum"
              value={formData.roundNum}
              onChange={handleInputChange}
              className="form-select"
            >
              <option value={1}>1차 검수</option>
              <option value={2}>2차 검수</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">랜덤 시드</label>
          <input
            type="number"
            name="seed"
            value={formData.seed}
            onChange={handleInputChange}
            className="form-input"
          />
          <small
            style={{
              color: "var(--gray-500)",
              display: "block",
              marginTop: "0.25rem",
            }}
          >
            동일한 시드값으로 재현 가능한 샘플링
          </small>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleSampling}
          disabled={loading}
          style={{ width: "100%" }}
        >
          {loading ? (
            <>
              <div
                className="spinner"
                style={{ width: "16px", height: "16px", borderWidth: "2px" }}
              ></div>
              샘플링 중...
            </>
          ) : (
            <>
              <Shuffle size={18} />
              샘플링 실행
            </>
          )}
        </button>
      </div>

      {/* 샘플링 결과 */}
      {result && (
        <>
          <div className="card">
            <h2 className="card-title">샘플링 결과</h2>

            <div className="alert alert-success">
              {result.session_info.sample_size.toLocaleString()}건의 샘플을
              추출했습니다.
            </div>

            <div className="metrics-grid" style={{ marginBottom: "1.5rem" }}>
              <div className="metric-card">
                <div className="metric-label">세션 ID</div>
                <div
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    marginTop: "0.25rem",
                    wordBreak: "break-all",
                  }}
                >
                  {result.session_id}
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-label">전체 데이터 수</div>
                <div className="metric-value">
                  {result.session_info.total_size.toLocaleString()}
                  <span className="metric-unit">건</span>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-label">샘플 크기</div>
                <div className="metric-value">
                  {result.session_info.sample_size.toLocaleString()}
                  <span className="metric-unit">건</span>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-label">검수 차수</div>
                <div className="metric-value">
                  {result.session_info.round_num}
                  <span className="metric-unit">차</span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
              <button
                className="btn btn-success"
                onClick={() => navigate(`/inspection/${result.session_id}`)}
                style={{ flex: 1 }}
              >
                <Play size={18} />
                수동 검수 시작
              </button>
              <button
                className="btn btn-secondary"
                onClick={downloadSampleCSV}
                style={{ flex: 1 }}
              >
                <Download size={18} />
                CSV 다운로드
              </button>
            </div>

            {/* <button
              className="btn btn-primary"
              onClick={handleAIBatchInspect}
              disabled={aiLoading}
              style={{ width: '100%' }}
            >
              {aiLoading ? (
                <>
                  <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                  AI 검수 중... (시간이 걸릴 수 있습니다)
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  AI 자동 검수 시작
                </>
              )
              }
            </button> */}
          </div>

          {/* 샘플 데이터 미리보기 */}
          <div className="card">
            <h2 className="card-title">샘플 데이터 미리보기 (최대 10개)</h2>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    {Object.keys(result.sample_data[0])
                      .slice(0, 6)
                      .map((key) => (
                        <th key={key}>{key}</th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {result.sample_data.slice(0, 10).map((row, idx) => (
                    <tr key={idx}>
                      {Object.keys(result.sample_data[0])
                        .slice(0, 6)
                        .map((key) => (
                          <td
                            key={key}
                            style={{
                              maxWidth: "200px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {row[key]}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Sampling;
