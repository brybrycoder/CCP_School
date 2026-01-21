
import { useEffect, useMemo, useState } from "react";
import {
  Line,
  LineChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  getDownloadUrl,
  getResult,
  listAnalyses,
  listDatasets,
  listJobs,
  submitJob,
} from "../lib/daasApi";
import type {
  AnalysisInfo,
  DatasetInfo,
  JobObject,
  ResultEnvelope,
} from "../contracts/daas.types";
import { useJobPoll } from "../hooks/useJobPoll";

type FormState = {
  institution: string;
  institutions: string;
  sex: string;
  yearFrom: string;
  yearTo: string;
  year: string;
  k: string;
};

const DEFAULT_FORM: FormState = {
  institution: "nus",
  institutions: "nus,ntu,smu",
  sex: "MF",
  yearFrom: "2010",
  yearTo: "2023",
  year: "2023",
  k: "5",
};

export default function DashboardPage() {
  const [datasets, setDatasets] = useState<DatasetInfo[]>([]);
  const [datasetId, setDatasetId] = useState("");
  const [analyses, setAnalyses] = useState<AnalysisInfo[]>([]);
  const [analysisType, setAnalysisType] = useState("");
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [jobs, setJobs] = useState<JobObject[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [result, setResult] = useState<ResultEnvelope | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loadingDatasets, setLoadingDatasets] = useState(true);
  const [loadingAnalyses, setLoadingAnalyses] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { job: selectedJob, error: jobError, isPolling } = useJobPoll(
    selectedJobId
  );

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoadingDatasets(true);
      setError(null);
      try {
        const data = await listDatasets();
        if (!active) {
          return;
        }
        setDatasets(data);
        const preferred =
          data.find((item) => item.datasetId === "intake_by_institutions")
            ?.datasetId ?? data[0]?.datasetId ?? "";
        setDatasetId(preferred);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Failed to load datasets."
          );
        }
      } finally {
        if (active) {
          setLoadingDatasets(false);
        }
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!datasetId) {
      return;
    }
    let active = true;
    const load = async () => {
      setLoadingAnalyses(true);
      setError(null);
      try {
        const data = await listAnalyses(datasetId);
        if (!active) {
          return;
        }
        setAnalyses(data);
        setAnalysisType(data[0]?.analysisType ?? "");
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Failed to load analyses."
          );
        }
      } finally {
        if (active) {
          setLoadingAnalyses(false);
        }
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [datasetId]);

  const refreshJobs = async () => {
    setLoadingJobs(true);
    setError(null);
    try {
      const data = await listJobs(20);
      setJobs(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load jobs.");
    } finally {
      setLoadingJobs(false);
    }
  };

  useEffect(() => {
    refreshJobs();
  }, []);

  useEffect(() => {
    const hasActive = jobs.some(
      (job) => job.status === "QUEUED" || job.status === "RUNNING"
    );
    if (!hasActive) {
      return;
    }
    const timer = window.setInterval(() => {
      refreshJobs();
    }, 2000);
    return () => {
      window.clearInterval(timer);
    };
  }, [jobs]);

  useEffect(() => {
    if (!selectedJob || selectedJob.status !== "SUCCEEDED") {
      setResult(null);
      setDownloadUrl(null);
      return;
    }

    let active = true;
    const loadResult = async () => {
      setResultError(null);
      try {
        const data = await getResult(selectedJob.jobId);
        if (active) {
          setResult(data);
        }
      } catch (err) {
        if (active) {
          setResultError(
            err instanceof Error ? err.message : "Failed to load result."
          );
        }
      }
    };

    const loadDownload = async () => {
      setDownloadError(null);
      try {
        const data = await getDownloadUrl(selectedJob.jobId);
        if (active) {
          setDownloadUrl(data.url);
        }
      } catch (err) {
        if (active) {
          setDownloadError(
            err instanceof Error ? err.message : "Failed to load download URL."
          );
        }
      }
    };

    loadResult();
    loadDownload();

    return () => {
      active = false;
    };
  }, [selectedJob]);

  const selectedAnalysis = useMemo(
    () => analyses.find((item) => item.analysisType === analysisType),
    [analyses, analysisType]
  );

  const chartData = useMemo(() => {
    if (!result) {
      return [];
    }
    const xKey = result.visualization.x;
    const map = new Map<string | number, Record<string, number | string>>();

    result.visualization.series.forEach((series) => {
      series.points.forEach((point) => {
        const key = point.x;
        if (!map.has(key)) {
          map.set(key, { [xKey]: key });
        }
        map.get(key)![series.name] = point.y;
      });
    });

    return Array.from(map.values());
  }, [result]);

  const buildParams = () => {
    if (analysisType === "compare_institutions") {
      return {
        institutions: form.institutions
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean),
        sex: form.sex,
        yearFrom: form.yearFrom ? Number(form.yearFrom) : undefined,
        yearTo: form.yearTo ? Number(form.yearTo) : undefined,
      };
    }
    if (analysisType === "topk_by_year") {
      return {
        year: form.year ? Number(form.year) : undefined,
        sex: form.sex,
        k: form.k ? Number(form.k) : 5,
      };
    }
    return {
      institution: form.institution,
      sex: form.sex,
      yearFrom: form.yearFrom ? Number(form.yearFrom) : undefined,
      yearTo: form.yearTo ? Number(form.yearTo) : undefined,
    };
  };

  const runAnalysis = async () => {
    if (!datasetId || !analysisType) {
      setError("Select a dataset and analysis type first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = await submitJob({
        datasetId,
        analysisType,
        params: buildParams(),
        outputFormat: "json",
      });
      setSelectedJobId(payload.jobId);
      await refreshJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit job.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "32px 24px 48px",
        background:
          "radial-gradient(circle at 10% 10%, #ffe7c9 0%, #fff1e2 30%, #f4f7ff 70%, #eef7ff 100%)",
        color: "#1f2933",
        fontFamily: '"Space Grotesk", "Segoe UI", sans-serif',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600&display=swap');
        body { margin: 0; background: #f8f5f0; }
        #root { width: 100%; }
        h1, h2, h3, h4 { font-weight: 600; letter-spacing: -0.02em; }
        button { border-radius: 999px; border: 1px solid #1f2933; background: #1f2933; color: #f8fafc; padding: 8px 16px; }
        button:disabled { opacity: 0.6; cursor: not-allowed; }
        input, select { border-radius: 10px; border: 1px solid #cbd5f5; padding: 8px 10px; background: #ffffff; }
        @media (max-width: 980px) { .dashboard-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div
          style={{
            padding: "18px 20px",
            borderRadius: "16px",
            background: "linear-gradient(120deg, #1f2933 0%, #0f172a 70%)",
            color: "#f8fafc",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={{ margin: 0 }}>DAaaS Analytics Studio</h1>
            <p style={{ margin: "6px 0 0", color: "#e2e8f0" }}>
              Explore descriptive, group-by, time-series, and comparative analysis in one workspace.
            </p>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.12)",
              padding: "10px 14px",
              borderRadius: "12px",
              fontSize: "14px",
            }}
          >
            Live API: {import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1"}
          </div>
        </div>

        {error && (
          <div
            style={{
              marginTop: "16px",
              padding: "12px 16px",
              borderRadius: "12px",
              background: "#ffe4e6",
              color: "#9f1239",
            }}
          >
            {error}
          </div>
        )}

        <div
          className="dashboard-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(320px, 1.1fr) minmax(320px, 1.6fr)",
            gap: "24px",
            marginTop: "24px",
          }}
        >
          <div>
            <div
              style={{
                borderRadius: "16px",
                padding: "18px",
                background: "#ffffff",
                boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
              }}
            >
              <h2 style={{ marginTop: 0 }}>Dataset + Analysis Controls</h2>
              {loadingDatasets && <p>Loading datasets...</p>}
              {!loadingDatasets && (
                <>
                  <label style={{ display: "block", marginBottom: "12px" }}>
                    Dataset
                    <select
                      value={datasetId}
                      onChange={(event) => setDatasetId(event.target.value)}
                      style={{ display: "block", width: "100%", marginTop: "6px" }}
                    >
                      {datasets.map((dataset) => (
                        <option key={dataset.datasetId} value={dataset.datasetId}>
                          {dataset.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  {loadingAnalyses ? (
                    <p>Loading analyses...</p>
                  ) : (
                    <label style={{ display: "block", marginBottom: "12px" }}>
                      Analysis Type
                      <select
                        value={analysisType}
                        onChange={(event) => setAnalysisType(event.target.value)}
                        style={{
                          display: "block",
                          width: "100%",
                          marginTop: "6px",
                        }}
                      >
                        {analyses.map((analysis) => (
                          <option
                            key={analysis.analysisType}
                            value={analysis.analysisType}
                          >
                            {analysis.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  {analysisType && (
                    <div
                      style={{
                        borderRadius: "14px",
                        border: "1px solid #e2e8f0",
                        padding: "12px",
                        background: "#f8fafc",
                      }}
                    >
                      <p style={{ marginTop: 0, color: "#475569" }}>
                        {selectedAnalysis?.output}
                      </p>
                      {(analysisType === "trend" ||
                        analysisType === "growth_rate") && (
                        <>
                          <label style={{ display: "block", marginBottom: "10px" }}>
                            Institution
                            <input
                              type="text"
                              value={form.institution}
                              onChange={(event) =>
                                setForm((prev) => ({
                                  ...prev,
                                  institution: event.target.value,
                                }))
                              }
                              style={{
                                display: "block",
                                width: "100%",
                                marginTop: "6px",
                              }}
                            />
                          </label>
                          <label style={{ display: "block", marginBottom: "10px" }}>
                            Sex
                            <select
                              value={form.sex}
                              onChange={(event) =>
                                setForm((prev) => ({
                                  ...prev,
                                  sex: event.target.value,
                                }))
                              }
                              style={{
                                display: "block",
                                width: "100%",
                                marginTop: "6px",
                              }}
                            >
                              <option value="">All</option>
                              <option value="F">F</option>
                              <option value="MF">MF</option>
                            </select>
                          </label>
                          <label style={{ display: "block", marginBottom: "10px" }}>
                            Year From
                            <input
                              type="number"
                              value={form.yearFrom}
                              onChange={(event) =>
                                setForm((prev) => ({
                                  ...prev,
                                  yearFrom: event.target.value,
                                }))
                              }
                              style={{
                                display: "block",
                                width: "100%",
                                marginTop: "6px",
                              }}
                            />
                          </label>
                          <label style={{ display: "block" }}>
                            Year To
                            <input
                              type="number"
                              value={form.yearTo}
                              onChange={(event) =>
                                setForm((prev) => ({
                                  ...prev,
                                  yearTo: event.target.value,
                                }))
                              }
                              style={{
                                display: "block",
                                width: "100%",
                                marginTop: "6px",
                              }}
                            />
                          </label>
                        </>
                      )}

                      {analysisType === "compare_institutions" && (
                        <>
                          <label style={{ display: "block", marginBottom: "10px" }}>
                            Institutions (comma-separated)
                            <input
                              type="text"
                              value={form.institutions}
                              onChange={(event) =>
                                setForm((prev) => ({
                                  ...prev,
                                  institutions: event.target.value,
                                }))
                              }
                              style={{
                                display: "block",
                                width: "100%",
                                marginTop: "6px",
                              }}
                            />
                          </label>
                          <label style={{ display: "block", marginBottom: "10px" }}>
                            Sex
                            <select
                              value={form.sex}
                              onChange={(event) =>
                                setForm((prev) => ({
                                  ...prev,
                                  sex: event.target.value,
                                }))
                              }
                              style={{
                                display: "block",
                                width: "100%",
                                marginTop: "6px",
                              }}
                            >
                              <option value="">All</option>
                              <option value="F">F</option>
                              <option value="MF">MF</option>
                            </select>
                          </label>
                          <label style={{ display: "block", marginBottom: "10px" }}>
                            Year From
                            <input
                              type="number"
                              value={form.yearFrom}
                              onChange={(event) =>
                                setForm((prev) => ({
                                  ...prev,
                                  yearFrom: event.target.value,
                                }))
                              }
                              style={{
                                display: "block",
                                width: "100%",
                                marginTop: "6px",
                              }}
                            />
                          </label>
                          <label style={{ display: "block" }}>
                            Year To
                            <input
                              type="number"
                              value={form.yearTo}
                              onChange={(event) =>
                                setForm((prev) => ({
                                  ...prev,
                                  yearTo: event.target.value,
                                }))
                              }
                              style={{
                                display: "block",
                                width: "100%",
                                marginTop: "6px",
                              }}
                            />
                          </label>
                        </>
                      )}

                      {analysisType === "topk_by_year" && (
                        <>
                          <label style={{ display: "block", marginBottom: "10px" }}>
                            Year
                            <input
                              type="number"
                              value={form.year}
                              onChange={(event) =>
                                setForm((prev) => ({
                                  ...prev,
                                  year: event.target.value,
                                }))
                              }
                              style={{
                                display: "block",
                                width: "100%",
                                marginTop: "6px",
                              }}
                            />
                          </label>
                          <label style={{ display: "block", marginBottom: "10px" }}>
                            Sex
                            <select
                              value={form.sex}
                              onChange={(event) =>
                                setForm((prev) => ({
                                  ...prev,
                                  sex: event.target.value,
                                }))
                              }
                              style={{
                                display: "block",
                                width: "100%",
                                marginTop: "6px",
                              }}
                            >
                              <option value="">All</option>
                              <option value="F">F</option>
                              <option value="MF">MF</option>
                            </select>
                          </label>
                          <label style={{ display: "block" }}>
                            K
                            <input
                              type="number"
                              value={form.k}
                              onChange={(event) =>
                                setForm((prev) => ({
                                  ...prev,
                                  k: event.target.value,
                                }))
                              }
                              style={{
                                display: "block",
                                width: "100%",
                                marginTop: "6px",
                              }}
                            />
                          </label>
                        </>
                      )}

                      <button
                        onClick={runAnalysis}
                        disabled={submitting}
                        style={{ marginTop: "14px" }}
                      >
                        {submitting ? "Running..." : "Run Analysis"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            <div
              style={{
                borderRadius: "16px",
                padding: "18px",
                background: "#111827",
                color: "#f8fafc",
                marginTop: "16px",
              }}
            >
              <h2 style={{ marginTop: 0 }}>Examples of Analytics Functions</h2>
              <p style={{ color: "#cbd5f5" }}>
                Teams are encouraged to be creative. Try combining descriptive stats with group-by or
                time-series visualizations.
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "12px",
                }}
              >
                {[
                  {
                    title: "Descriptive Statistics",
                    detail: "Averages, distributions, and trend summaries over time.",
                  },
                  {
                    title: "Group-by Analysis",
                    detail: "Break down metrics by region, institution, or category.",
                  },
                  {
                    title: "Time-series Analysis",
                    detail: "Line charts of changes across years or cohorts.",
                  },
                  {
                    title: "Comparative Analysis",
                    detail: "Compare institutions or years side-by-side.",
                  },
                  {
                    title: "Projection (Optional)",
                    detail: "Simple trend extrapolation for quick forecasts.",
                  },
                ].map((card) => (
                  <div
                    key={card.title}
                    style={{
                      borderRadius: "12px",
                      background: "rgba(255,255,255,0.08)",
                      padding: "12px",
                    }}
                  >
                    <strong>{card.title}</strong>
                    <p style={{ margin: "6px 0 0", color: "#cbd5f5" }}>{card.detail}</p>
                  </div>
                ))}
              </div>
            </div>
            <div
              style={{
                borderRadius: "16px",
                padding: "18px",
                background: "#ffffff",
                boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
                marginTop: "16px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <h2 style={{ marginTop: 0 }}>Jobs</h2>
                <button onClick={refreshJobs}>Refresh</button>
              </div>
              {loadingJobs && <p>Loading jobs...</p>}
              {!loadingJobs && (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                        Job ID
                      </th>
                      <th style={{ borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                        Analysis
                      </th>
                      <th style={{ borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                        Status
                      </th>
                      <th style={{ borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                        Created
                      </th>
                      <th style={{ borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr key={job.jobId}>
                        <td style={{ padding: "8px 4px" }}>
                          {job.jobId.slice(0, 8)}...
                        </td>
                        <td style={{ padding: "8px 4px" }}>{job.analysisType}</td>
                        <td style={{ padding: "8px 4px" }}>
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: "999px",
                              background:
                                job.status === "FAILED"
                                  ? "#fee2e2"
                                  : job.status === "SUCCEEDED"
                                  ? "#dcfce7"
                                  : "#e0f2fe",
                              color:
                                job.status === "FAILED"
                                  ? "#b91c1c"
                                  : job.status === "SUCCEEDED"
                                  ? "#166534"
                                  : "#0369a1",
                            }}
                          >
                            {job.status}
                          </span>
                        </td>
                        <td style={{ padding: "8px 4px" }}>
                          {new Date(job.createdAt).toLocaleString()}
                        </td>
                        <td style={{ padding: "8px 4px" }}>
                          <button onClick={() => setSelectedJobId(job.jobId)}>
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div>
            <div
              style={{
                borderRadius: "16px",
                padding: "18px",
                background: "#ffffff",
                boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
                position: "sticky",
                top: "24px",
              }}
            >
              <h2>Selected Job + Result</h2>
              {jobError && <p style={{ color: "crimson" }}>{jobError}</p>}
              {!selectedJob && <p>Select a job to see details.</p>}
              {selectedJob && (
                <>
                  <p>
                    <strong>Status:</strong> {selectedJob.status}
                    {isPolling && <span style={{ marginLeft: "8px" }}>(Polling)</span>}
                  </p>
                  <p>
                    <strong>Updated:</strong>{" "}
                    {new Date(selectedJob.updatedAt).toLocaleString()}
                  </p>
                  <div style={{ marginBottom: "12px" }}>
                    <strong>Params:</strong>
                    <pre
                      style={{
                        background: "#f8fafc",
                        padding: "12px",
                        overflowX: "auto",
                        borderRadius: "12px",
                      }}
                    >
                      {JSON.stringify(selectedJob.params, null, 2)}
                    </pre>
                  </div>
                  {selectedJob.status === "FAILED" && (
                    <p style={{ color: "crimson" }}>
                      {selectedJob.error || "The job failed. Please try again."}
                    </p>
                  )}
                </>
              )}

              {selectedJob?.status === "SUCCEEDED" && (
                <div>
                  <h3>Result</h3>
                  {resultError && <p style={{ color: "crimson" }}>{resultError}</p>}
                  {!result && !resultError && <p>Loading result...</p>}
                  {result && (
                    <>
                      <p>{result.summary}</p>
                      {result.visualization.series.length > 0 && (
                        <div style={{ height: "320px", width: "100%" }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey={result.visualization.x} />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              {result.visualization.series.map((series) => (
                                <Line
                                  key={series.name}
                                  dataKey={series.name}
                                  type="monotone"
                                  strokeWidth={2}
                                  dot={false}
                                />
                              ))}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                      <h4>Table</h4>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr>
                            {result.table.columns.map((column) => (
                              <th
                                key={column}
                                style={{
                                  borderBottom: "1px solid #e2e8f0",
                                  textAlign: "left",
                                }}
                              >
                                {column}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {result.table.rows.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                              {row.map((cell: any, cellIndex: number) => (
                                <td key={cellIndex} style={{ padding: "6px 4px" }}>
                                  {String(cell)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                  <div style={{ marginTop: "12px" }}>
                    {downloadError && (
                      <p style={{ color: "crimson" }}>{downloadError}</p>
                    )}
                    {downloadUrl && (
                      <button onClick={() => window.open(downloadUrl, "_blank")}>
                        Download Result
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
