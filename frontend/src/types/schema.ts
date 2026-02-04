// --- START CONTRACT ---
export type JobStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';

export interface VisualizationSeries {
  name: string;
  points: { x: number | string; y: number }[];
}

export interface AnalyticsResult {
  datasetId: string;
  analysisType: string;
  params: Record<string, any>;
  generatedAt: string;
  summary: string;
  visualization: {
    chartType: 'line' | 'bar';
    x: string;
    y: string;
    series: VisualizationSeries[];
  };
  table: {
    columns: string[];
    rows: (string | number)[][];
  };
  meta: { unit: string; notes?: string };
}

export interface Job {
  jobId: string;
  userId: string;
  datasetId: string;
  analysisType: string;
  params: Record<string, any>;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  result?: { s3Bucket: string; s3Key: string };
  error?: string | null;
}
// --- END CONTRACT ---

// Additional types for the Intake Analytics feature
export type Sex = 'F' | 'M' | 'MF';

export type AnalysisMode = 
  | 'trend' 
  | 'comparison' 
  | 'growth' 
  | 'gender'
  | 'gender_distribution' 
  | 'sector_comparison';

export interface InstitutionGroup {
  name: string;
  institutions: InstitutionKey[];
}

export type InstitutionKey =
  | 'nus'
  | 'ntu'
  | 'smu'
  | 'sit'
  | 'sutd'
  | 'suss'
  | 'singapore_polytechnic'
  | 'ngee_ann_polytechnic'
  | 'temasek_polytechnic'
  | 'nanyang_polytechnic'
  | 'republic_polytechnic'
  | 'nie'
  | 'ite'
  | 'lasalle_diploma'
  | 'lasalle_degree'
  | 'nafa_diploma'
  | 'nafa_degree';

export interface IntakeDataRow {
  year: number;
  sex: Sex;
  nus: number | null;
  ntu: number | null;
  smu: number | null;
  sit: number | null;
  sutd: number | null;
  suss: number | null;
  singapore_polytechnic: number | null;
  ngee_ann_polytechnic: number | null;
  temasek_polytechnic: number | null;
  nanyang_polytechnic: number | null;
  republic_polytechnic: number | null;
  nie: number | null;
  ite: number | null;
  lasalle_diploma: number | null;
  lasalle_degree: number | null;
  nafa_diploma: number | null;
  nafa_degree: number | null;
}

export interface IntakeAnalyticsParams {
  institutions: InstitutionKey[];
  yearFrom: number;
  yearTo: number;
  sex: Sex;
  analysisMode: AnalysisMode;
  comparisonYear?: number;
}
