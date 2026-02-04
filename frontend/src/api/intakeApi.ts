import axios from 'axios';

// API base URL for the DAaaS FastAPI backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Create a dedicated axios instance for the DAaaS API
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Dataset {
  datasetId: string;
  name: string;
  description: string;
  timeField: string;
  dimensions: string[];
  metrics: string[];
}

export interface Analysis {
  analysisType: string;
  name: string;
  paramsSchema: Record<string, string>;
  output: string;
}

export interface JobSubmitResponse {
  jobId: string;
  status: string;
}

export interface DataPoint {
  x: number | string;
  y: number;
}

export interface ChartSeries {
  name: string;
  points: DataPoint[];
}

export interface Visualization {
  chartType: string;
  x: string;
  y: string;
  series: ChartSeries[];
}

export interface JobResult {
  datasetId: string;
  analysisType: string;
  params: Record<string, unknown>;
  generatedAt: string;
  summary: string;
  visualization: Visualization;
  table: {
    columns: string[];
    rows: (number | string)[][];
  };
  meta: {
    notes: string;
  };
}

export interface JobStatus {
  jobId: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'SUCCEEDED' | 'FAILED';
  result?: JobResult;
}

export interface ApiJob {
  jobId: string;
  userId: string;
  datasetId: string;
  analysisType: string;
  params: Record<string, unknown>;
  status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  createdAt: string;
  updatedAt: string;
  result?: JobResult | null;
  error?: string | null;
}

export interface JobsListResponse {
  items: ApiJob[];
  nextCursor?: string;
}
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Poll for job completion with exponential backoff
 */
const pollJobResult = async (jobId: string, maxAttempts = 30, initialDelay = 500): Promise<JobResult> => {
  let attempts = 0;
  let delay = initialDelay;
  
  while (attempts < maxAttempts) {
    const response = await apiClient.get<JobStatus>(`/api/v1/jobs/${jobId}`);
    const job = response.data;
    
    // Check for both COMPLETED and SUCCEEDED status
    if (job.status === 'COMPLETED' || job.status === 'SUCCEEDED') {
      // Fetch the full result
      const resultResponse = await apiClient.get<JobResult>(`/api/v1/jobs/${jobId}/result`);
      return resultResponse.data;
    }
    
    if (job.status === 'FAILED') {
      throw new Error(`Job ${jobId} failed`);
    }
    
    // Wait before next poll with exponential backoff
    await new Promise(resolve => setTimeout(resolve, delay));
    delay = Math.min(delay * 1.5, 5000);
    attempts++;
  }
  
  throw new Error(`Job ${jobId} timed out after ${maxAttempts} attempts`);
};

/**
 * Submit a job and wait for the result
 */
const submitAndWaitForResult = async (
  datasetId: string,
  analysisType: string,
  filters: Record<string, unknown>
): Promise<JobResult> => {
  const response = await apiClient.post<JobSubmitResponse>('/api/v1/jobs', {
    datasetId,
    analysisType,
    filters,
  });
  
  return pollJobResult(response.data.jobId);
};

// ============================================================================
// INTAKE API ENDPOINTS
// ============================================================================

export const intakeApi = {
  /**
   * Check API health status
   */
  healthCheck: async (): Promise<{ status: string }> => {
    const response = await apiClient.get<{ status: string }>('/health');
    return response.data;
  },

  /**
   * Get list of all jobs (recent jobs for dashboard)
   */
  getJobs: async (limit?: number): Promise<ApiJob[]> => {
    const params = limit ? `?limit=${limit}` : '';
    const response = await apiClient.get<JobsListResponse>(`/api/v1/jobs${params}`);
    return response.data.items;
  },

  /**
   * Get list of available datasets
   */
  getDatasets: async (): Promise<Dataset[]> => {
    const response = await apiClient.get<Dataset[]>('/api/v1/datasets');
    return response.data;
  },

  /**
   * Get available analyses for a dataset
   */
  getAnalyses: async (datasetId: string): Promise<Analysis[]> => {
    const response = await apiClient.get<Analysis[]>(`/api/v1/analyses?datasetId=${datasetId}`);
    return response.data;
  },

  /**
   * Get time series data (intake trend over time)
   */
  getTimeSeries: async (sex: string = 'MF'): Promise<JobResult> => {
    return submitAndWaitForResult('intake_by_institutions', 'time_series', { sex });
  },

  /**
   * Get group by data (intake by institution)
   */
  getGroupByInstitution: async (sex: string = 'MF'): Promise<JobResult> => {
    return submitAndWaitForResult('intake_by_institutions', 'group_by', { 
      group_by: 'institution',
      sex 
    });
  },

  /**
   * Get comparative data for multiple institutions
   */
  getComparative: async (institutions: string[], sex: string = 'MF'): Promise<JobResult> => {
    return submitAndWaitForResult('intake_by_institutions', 'comparative', { 
      institutions,
      sex 
    });
  },

  /**
   * Get gender comparison data (Male vs Female trends over time)
   */
  getGenderComparison: async (institutions?: string[]): Promise<JobResult> => {
    const filters: Record<string, unknown> = { compare_by: 'sex' };
    if (institutions && institutions.length > 0) {
      filters.institutions = institutions;
    }
    return submitAndWaitForResult('intake_by_institutions', 'gender_comparison', filters);
  },

  /**
   * Get descriptive statistics
   */
  getDescriptive: async (sex: string = 'MF', yearFrom?: number, yearTo?: number): Promise<JobResult> => {
    const filters: Record<string, unknown> = { sex };
    if (yearFrom) filters.yearFrom = yearFrom;
    if (yearTo) filters.yearTo = yearTo;
    return submitAndWaitForResult('intake_by_institutions', 'descriptive', filters);
  },

  /**
   * Get projection data (forecast)
   */
  getProjection: async (sex: string = 'MF'): Promise<JobResult> => {
    return submitAndWaitForResult('intake_by_institutions', 'projection', { sex });
  },

  /**
   * Submit a custom job
   */
  submitJob: async (
    datasetId: string,
    analysisType: string,
    filters: Record<string, unknown>
  ): Promise<JobResult> => {
    return submitAndWaitForResult(datasetId, analysisType, filters);
  },

  /**
   * Get job status
   */
  getJobStatus: async (jobId: string): Promise<JobStatus> => {
    const response = await apiClient.get<JobStatus>(`/api/v1/jobs/${jobId}`);
    return response.data;
  },

  /**
   * Get job result directly
   */
  getJobResult: async (jobId: string): Promise<JobResult> => {
    const response = await apiClient.get<JobResult>(`/api/v1/jobs/${jobId}/result`);
    return response.data;
  },
};

export default intakeApi;
