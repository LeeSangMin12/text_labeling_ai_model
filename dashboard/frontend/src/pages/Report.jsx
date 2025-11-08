import React, { useState, useEffect } from "react";
import { api } from "../api/client";
import {
  FileText,
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";

function Report() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    try {
      const response = await api.getReportSummary();
      setReport(response.data);
    } catch (error) {
      console.error("리포트 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const downloadSessionExcel = async (sessionId) => {
    try {
      const response = await api.getInspectionResult(sessionId);
      const sessionData = response.data;

      // 엑셀 데이터 생성 (전체 데이터)
      // 라벨링 데이터인지 확인
      const isLabeled = sessionId.includes("labeled");

      let headers, rows;
      if (isLabeled) {
        // 라벨링 데이터: 원본 라벨 vs 검수 결과 비교 + 유사 질문 검수
        headers = [
          "ID",
          "질문",
          "답변",
          "원본_광고",
          "검수_광고",
          "광고_일치",
          "원본_허위정보",
          "검수_허위정보",
          "허위정보_일치",
          "라벨_오분류",
          "유사질문1_ID",
          "유사질문1_검수결과",
          "유사질문2_ID",
          "유사질문2_검수결과",
          "유사질문3_ID",
          "유사질문3_검수결과",
          "상태",
        ];
        rows = sessionData.inspections.map((item) => {
          const adMatch =
            item.original_is_ad === item.is_ad_checked ? "일치" : "불일치";
          const fakeMatch =
            item.original_is_fake === item.is_fake_checked ? "일치" : "불일치";

          // 라벨 오분류 여부 (광고 또는 허위정보 중 하나라도 불일치하면 오분류)
          const labelMismatch =
            item.original_is_ad !== item.is_ad_checked ||
            item.original_is_fake !== item.is_fake_checked;

          // 유사 질문 정보 추출 (최대 3개)
          const sim1 = item.similarity_checks?.[0];
          const sim2 = item.similarity_checks?.[1];
          const sim3 = item.similarity_checks?.[2];

          return [
            item.id,
            item.question || "",
            item.answer || "",
            item.original_is_ad ? "예" : "아니오",
            item.is_ad_checked ? "예" : "아니오",
            adMatch,
            item.original_is_fake ? "예" : "아니오",
            item.is_fake_checked ? "예" : "아니오",
            fakeMatch,
            labelMismatch ? "오분류" : "정상",
            sim1?.similar_id || "-",
            sim1 ? (sim1.is_similar ? "유사함" : "유사하지않음") : "-",
            sim2?.similar_id || "-",
            sim2 ? (sim2.is_similar ? "유사함" : "유사하지않음") : "-",
            sim3?.similar_id || "-",
            sim3 ? (sim3.is_similar ? "유사함" : "유사하지않음") : "-",
            item.status === "pass" ? "적합" : "부적합",
          ];
        });
      } else {
        // 전처리 데이터: 기존 형식 유지
        headers = ["ID", "질문", "답변", "상태", "부적합 이유"];
        rows = sessionData.inspections.map((item) => [
          item.id,
          item.question || "",
          item.answer || "",
          item.status === "pass" ? "적합" : "부적합",
          item.comment || "",
        ]);
      }

      // CSV 생성
      const csvRows = [
        headers.join(","),
        ...rows.map((row) =>
          row
            .map((cell) => {
              const value = String(cell);
              // CSV에서 콤마와 따옴표 처리
              if (
                value.includes(",") ||
                value.includes('"') ||
                value.includes("\n")
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
      link.download = `inspection_${sessionId}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("다운로드 실패:", error);
      alert("엑셀 다운로드에 실패했습니다.");
    }
  };

  const downloadReport = () => {
    if (!report) return;

    const reportText = generateReportText(report);
    const blob = new Blob([reportText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inspection_report_${
      new Date().toISOString().split("T")[0]
    }.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const generateReportText = (data) => {
    const date = new Date(data.generated_at).toLocaleString("ko-KR");

    let text = `
========================================
데이터셋 검수 종합 리포트
========================================

생성 일시: ${date}

----------------------------------------
1. 전처리 데이터셋 검수 결과
----------------------------------------
`;

    if (
      data.preprocessed_data &&
      Object.keys(data.preprocessed_data).length > 0
    ) {
      const prep = data.preprocessed_data;
      text += `
총 레코드 수: ${prep.total_records?.toLocaleString() || "N/A"}건
최대 결측률: ${prep.max_missing_rate || "N/A"}%
중복률: ${prep.duplicate_rate || "N/A"}%
`;

      if (prep.criteria) {
        text += `\n인수 기준 판정:\n`;
        Object.entries(prep.criteria).forEach(([key, criterion]) => {
          text += `  - ${criterion.description}: ${
            criterion.passed ? "✓ 통과" : "✗ 실패"
          }\n`;
        });
        text += `\n종합 판정: ${prep.all_passed ? "✓ 적합" : "✗ 부적합"}\n`;
      }
    } else {
      text += `데이터 없음\n`;
    }

    text += `
----------------------------------------
2. 라벨링 데이터셋 검수 결과
----------------------------------------
`;

    if (data.labeled_data && Object.keys(data.labeled_data).length > 0) {
      const label = data.labeled_data;
      text += `
총 라벨링 수: ${label.total_records?.toLocaleString() || "N/A"}건
광고: ${label.ad_count?.toLocaleString() || "N/A"}건
허위정보: ${label.fake_count?.toLocaleString() || "N/A"}건
유사 질문: ${label.similar_count?.toLocaleString() || "N/A"}건
라벨 누락률: ${label.label_missing_rate || "N/A"}%
`;

      if (label.criteria) {
        text += `\n인수 기준 판정:\n`;
        Object.entries(label.criteria).forEach(([key, criterion]) => {
          text += `  - ${criterion.description}: ${
            criterion.passed ? "✓ 통과" : "✗ 실패"
          }\n`;
        });
        text += `\n종합 판정: ${
          label.all_passed ? "✓ 적합 (샘플 검수 필요)" : "✗ 부적합"
        }\n`;
      }
    } else {
      text += `데이터 없음\n`;
    }

    text += `
----------------------------------------
3. 샘플 검수 결과
----------------------------------------
`;

    if (data.inspection_sessions && data.inspection_sessions.length > 0) {
      data.inspection_sessions.forEach((session, idx) => {
        text += `
${idx + 1}. ${session.session_id}
   - 검수 완료: ${session.inspected_count}건
   - 합격률: ${session.pass_rate}%
   - 저장 일시: ${new Date(session.saved_at).toLocaleString("ko-KR")}
`;
      });
    } else {
      text += `검수 이력 없음\n`;
    }

    text += `
========================================
보고서 끝
========================================
`;

    return text;
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="alert alert-danger">리포트를 로드할 수 없습니다.</div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">검수 리포트</h1>
        <p className="page-description">종합 검수 결과 및 통계</p>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "1rem",
        }}
      >
        {/* <button className="btn btn-primary" onClick={downloadReport}>
          <Download size={18} />
          리포트 다운로드
        </button> */}
      </div>

      {/* 전처리 데이터 결과 */}
      {/* {report.preprocessed_data &&
        Object.keys(report.preprocessed_data).length > 0 && (
          <div className="card">
            <h2 className="card-title">1. 전처리 데이터셋 검수 결과</h2>

            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-label">총 레코드 수</div>
                <div className="metric-value">
                  {report.preprocessed_data.total_records?.toLocaleString() ||
                    "N/A"}
                  <span className="metric-unit">건</span>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-label">최대 결측률</div>
                <div className="metric-value">
                  {report.preprocessed_data.max_missing_rate || "N/A"}
                  <span className="metric-unit">%</span>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-label">중복률</div>
                <div className="metric-value">
                  {report.preprocessed_data.duplicate_rate || "N/A"}
                  <span className="metric-unit">%</span>
                </div>
              </div>
            </div>

            {report.preprocessed_data.criteria && (
              <>
                <h3
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: "600",
                    marginTop: "1.5rem",
                    marginBottom: "1rem",
                  }}
                >
                  인수 기준 판정
                </h3>

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
                      {Object.entries(report.preprocessed_data.criteria).map(
                        ([key, criterion]) => (
                          <tr key={key}>
                            <td>{criterion.description}</td>
                            <td>
                              <strong>
                                {criterion.value.toLocaleString()}
                              </strong>
                              {key === "record_count" ? "건" : "%"}
                            </td>
                            <td>
                              {key === "record_count" ? "≥" : "≤"}{" "}
                              {criterion.threshold.toLocaleString()}
                              {key === "record_count" ? "건" : "%"}
                            </td>
                            <td>
                              {criterion.passed ? (
                                <span className="badge badge-success">
                                  <CheckCircle
                                    size={14}
                                    style={{ marginRight: "4px" }}
                                  />
                                  통과
                                </span>
                              ) : (
                                <span className="badge badge-danger">
                                  <XCircle
                                    size={14}
                                    style={{ marginRight: "4px" }}
                                  />
                                  실패
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>

                {report.preprocessed_data.all_passed ? (
                  <div
                    className="alert alert-success"
                    style={{ marginTop: "1rem" }}
                  >
                    <CheckCircle
                      size={18}
                      style={{ marginRight: "8px", display: "inline" }}
                    />
                    <strong>종합 판정: 적합</strong>
                  </div>
                ) : (
                  <div
                    className="alert alert-danger"
                    style={{ marginTop: "1rem" }}
                  >
                    <XCircle
                      size={18}
                      style={{ marginRight: "8px", display: "inline" }}
                    />
                    <strong>종합 판정: 부적합</strong>
                  </div>
                )}
              </>
            )}
          </div>
        )} */}

      {/* 라벨링 데이터 결과 */}
      {/* {report.labeled_data && Object.keys(report.labeled_data).length > 0 && (
        <div className="card">
          <h2 className="card-title">2. 라벨링 데이터셋 검수 결과</h2>

          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label">총 라벨링 수</div>
              <div className="metric-value">
                {report.labeled_data.total_records?.toLocaleString() || "N/A"}
                <span className="metric-unit">건</span>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">광고</div>
              <div className="metric-value">
                {report.labeled_data.ad_count?.toLocaleString() || "N/A"}
                <span className="metric-unit">건</span>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">허위정보</div>
              <div className="metric-value">
                {report.labeled_data.fake_count?.toLocaleString() || "N/A"}
                <span className="metric-unit">건</span>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">유사 질문</div>
              <div className="metric-value">
                {report.labeled_data.similar_count?.toLocaleString() || "N/A"}
                <span className="metric-unit">건</span>
              </div>
            </div>
          </div>

          {report.labeled_data.criteria && (
            <>
              <h3
                style={{
                  fontSize: "1.1rem",
                  fontWeight: "600",
                  marginTop: "1.5rem",
                  marginBottom: "1rem",
                }}
              >
                인수 기준 판정
              </h3>

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
                    {Object.entries(report.labeled_data.criteria).map(
                      ([key, criterion]) => (
                        <tr key={key}>
                          <td>{criterion.description}</td>
                          <td>
                            <strong>{criterion.value.toLocaleString()}</strong>
                            {key === "record_count" ? "건" : "%"}
                          </td>
                          <td>
                            {key === "record_count" ? "≥" : "≤"}{" "}
                            {criterion.threshold.toLocaleString()}
                            {key === "record_count" ? "건" : "%"}
                          </td>
                          <td>
                            {criterion.passed ? (
                              <span className="badge badge-success">
                                <CheckCircle
                                  size={14}
                                  style={{ marginRight: "4px" }}
                                />
                                통과
                              </span>
                            ) : (
                              <span className="badge badge-danger">
                                <XCircle
                                  size={14}
                                  style={{ marginRight: "4px" }}
                                />
                                실패
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {report.labeled_data.all_passed ? (
                <div className="alert alert-info" style={{ marginTop: "1rem" }}>
                  <CheckCircle
                    size={18}
                    style={{ marginRight: "8px", display: "inline" }}
                  />
                  <strong>종합 판정: 적합</strong> (최종검수 일치율은 샘플
                  검수를 통해 확인 필요)
                </div>
              ) : (
                <div
                  className="alert alert-danger"
                  style={{ marginTop: "1rem" }}
                >
                  <XCircle
                    size={18}
                    style={{ marginRight: "8px", display: "inline" }}
                  />
                  <strong>종합 판정: 부적합</strong>
                </div>
              )}
            </>
          )}
        </div>
      )} */}

      {/* 샘플 검수 결과 */}
      <div className="card">
        <h2 className="card-title">샘플 검수 결과</h2>

        {report.inspection_sessions && report.inspection_sessions.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>세션 ID</th>
                  <th>검수 완료</th>
                  <th>합격률</th>
                  <th>라벨 오분류율</th>
                  {/* <th>저장 일시</th> */}
                  <th>상태</th>
                  <th>다운로드</th>
                </tr>
              </thead>
              <tbody>
                {report.inspection_sessions.map((session, idx) => {
                  const isLabeled = session.session_id.includes("labeled");
                  return (
                    <React.Fragment key={idx}>
                      <tr>
                        <td style={{ fontSize: "0.85rem" }}>
                          {session.session_id}
                        </td>
                        <td>{session.inspected_count}건</td>
                        <td>
                          <strong>{session.pass_rate}%</strong>
                        </td>
                        <td>
                          {isLabeled &&
                          session.label_mismatch_rate !== undefined ? (
                            <strong
                              style={{
                                color:
                                  session.label_mismatch_rate <= 3
                                    ? "#10b981"
                                    : "#ef4444",
                              }}
                            >
                              {session.label_mismatch_rate}%
                            </strong>
                          ) : (
                            <span style={{ color: "var(--gray-400)" }}>-</span>
                          )}
                        </td>
                        {/* <td style={{ fontSize: "0.85rem" }}>
                          {new Date(session.saved_at).toLocaleString("ko-KR")}
                        </td> */}
                        <td>
                          {(() => {
                            // 라벨링 데이터인 경우: 합격률 + 라벨 오분류율 모두 체크
                            if (isLabeled) {
                              const passRateOk = session.pass_rate >= 90;
                              const labelOk =
                                session.label_mismatch_rate !== undefined &&
                                session.label_mismatch_rate <= 3;

                              if (passRateOk && labelOk) {
                                return (
                                  <span className="badge badge-success">
                                    기준 충족
                                  </span>
                                );
                              } else if (session.pass_rate >= 80) {
                                return (
                                  <span className="badge badge-warning">
                                    주의 {!passRateOk && "(합격률)"}{" "}
                                    {!labelOk && "(라벨)"}
                                  </span>
                                );
                              } else {
                                return (
                                  <span className="badge badge-danger">
                                    기준 미달
                                  </span>
                                );
                              }
                            } else {
                              // 전처리 데이터인 경우: 합격률만 체크
                              if (session.pass_rate >= 90) {
                                return (
                                  <span className="badge badge-success">
                                    기준 충족 (≥90%)
                                  </span>
                                );
                              } else if (session.pass_rate >= 80) {
                                return (
                                  <span className="badge badge-warning">
                                    주의 (80-89%)
                                  </span>
                                );
                              } else {
                                return (
                                  <span className="badge badge-danger">
                                    기준 미달 (&lt;80%)
                                  </span>
                                );
                              }
                            }
                          })()}
                        </td>
                        <td>
                          <button
                            className="btn btn-secondary"
                            onClick={() =>
                              downloadSessionExcel(session.session_id)
                            }
                            style={{
                              padding: "0.4rem 0.75rem",
                              fontSize: "0.85rem",
                            }}
                          >
                            <Download
                              size={14}
                              style={{ marginRight: "4px" }}
                            />
                            엑셀 다운로드
                          </button>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="alert alert-warning">
            <AlertTriangle
              size={18}
              style={{ marginRight: "8px", display: "inline" }}
            />
            아직 검수 이력이 없습니다. 샘플 검수를 진행해주세요.
          </div>
        )}
      </div>

      {/* 최종 의견 */}
      {/* <div className="card">
        <h2 className="card-title">최종 의견</h2>
        <div className="form-group">
          <label className="form-label">검수자 의견</label>
          <textarea
            className="form-input"
            rows="5"
            placeholder="최종 검수 의견을 입력하세요..."
            style={{ resize: 'vertical' }}
          />
        </div>
        <button className="btn btn-primary">
          <FileText size={18} />
          최종 리포트 제출
        </button>
      </div> */}
    </div>
  );
}

export default Report;
