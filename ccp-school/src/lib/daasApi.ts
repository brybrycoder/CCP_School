import { requestJson } from "./apiClient";
import type {
  AnalysisInfo,
  DatasetInfo,
  JobObject,
  ResultEnvelope,
} from "../contracts/daas.types";

export function listDatasets(): Promise<DatasetInfo[]> {
  return requestJson<DatasetInfo[]>("/datasets");
}

export function listAnalyses(datasetId: string): Promise<AnalysisInfo[]> {
  const qs = new URLSearchParams({ datasetId }).toString();
  return requestJson<AnalysisInfo[]>(`/analyses?${qs}`);
}

export function submitJob(body: {
  datasetId: string;
  analysisType: string;
  params: any;
  outputFormat: "json" | "csv";
}): Promise<{ jobId: string; status: string }> {
  return requestJson<{ jobId: string; status: string }>("/jobs", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function listJobs(
  limit: number,
  cursor?: string
): Promise<{ items: JobObject[]; nextCursor: string | null }> {
  const qs = new URLSearchParams({ limit: String(limit) });
  if (cursor) {
    qs.set("cursor", cursor);
  }
  return requestJson<{ items: JobObject[]; nextCursor: string | null }>(
    `/jobs?${qs.toString()}`
  );
}

export function getJob(jobId: string): Promise<JobObject> {
  return requestJson<JobObject>(`/jobs/${jobId}`);
}

export function getResult(jobId: string): Promise<ResultEnvelope> {
  return requestJson<ResultEnvelope>(`/jobs/${jobId}/result`);
}

export function getDownloadUrl(
  jobId: string
): Promise<{ url: string; expiresInSeconds: number }> {
  return requestJson<{ url: string; expiresInSeconds: number }>(
    `/jobs/${jobId}/download`
  );
}
