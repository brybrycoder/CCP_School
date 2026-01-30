import { apiClient } from './client';
import { Job, AnalyticsResult } from '../types';

/**
 * Jobs API Endpoints
 */
export const jobsApi = {
  /**
   * Fetch all jobs for the current user
   */
  getJobs: async (): Promise<Job[]> => {
    const response = await apiClient.get<Job[]>('/jobs');
    return response.data;
  },

  /**
   * Fetch a specific job by ID
   */
  getJob: async (jobId: string): Promise<Job> => {
    const response = await apiClient.get<Job>(`/jobs/${jobId}`);
    return response.data;
  },

  /**
   * Create a new analytics job
   */
  createJob: async (params: {
    datasetId: string;
    analysisType: string;
    params: Record<string, any>;
  }): Promise<Job> => {
    const response = await apiClient.post<Job>('/jobs', params);
    return response.data;
  },

  /**
   * Cancel a running job
   */
  cancelJob: async (jobId: string): Promise<void> => {
    await apiClient.delete(`/jobs/${jobId}`);
  },
};

/**
 * Analytics Results API Endpoints
 */
export const analyticsApi = {
  /**
   * Fetch analytics result from S3
   */
  getResult: async (jobId: string): Promise<AnalyticsResult> => {
    const response = await apiClient.get<AnalyticsResult>(`/results/${jobId}`);
    return response.data;
  },

  /**
   * Get pre-signed URL for downloading raw data
   */
  getDownloadUrl: async (jobId: string): Promise<{ url: string }> => {
    const response = await apiClient.get<{ url: string }>(`/results/${jobId}/download`);
    return response.data;
  },
};

/**
 * Datasets API Endpoints
 */
export const datasetsApi = {
  /**
   * List available datasets
   */
  getDatasets: async (): Promise<{ id: string; name: string; description: string }[]> => {
    const response = await apiClient.get('/datasets');
    return response.data;
  },

  /**
   * Get dataset metadata
   */
  getDatasetMeta: async (datasetId: string): Promise<{
    id: string;
    name: string;
    columns: string[];
    rowCount: number;
  }> => {
    const response = await apiClient.get(`/datasets/${datasetId}`);
    return response.data;
  },
};
