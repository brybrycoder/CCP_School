export type JobStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";

export type DatasetInfo = {
  datasetId: string;
  name: string;
  description: string;
  timeField: string;
  dimensions: string[];
  metrics: string[];
};

export type AnalysisInfo = {
  analysisType: string;
  name: string;
  paramsSchema: Record<string, string>;
  output: string;
};

export type JobObject = {
  jobId: string;
  userId: string;
  datasetId: string;
  analysisType: string;
  params: Record<string, any>;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  result?: { s3Bucket: string; s3Key: string } | null;
  error?: string | null;
};

export type ResultEnvelope = {
  datasetId: string;
  analysisType: string;
  params: Record<string, any>;
  generatedAt: string;
  summary: string;
  visualization: {
    chartType: "line" | "bar";
    x: string;
    y: string;
    series: Array<{ name: string; points: Array<{ x: number | string; y: number }> }>;
  };
  table: { columns: string[]; rows: any[][] };
  meta?: { unit?: string; notes?: string };
};
