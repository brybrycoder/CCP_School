import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  BarChart3,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Table, Column } from '../components/ui';
import { JobStatus } from '../types';
import { intakeApi, ApiJob } from '../api';
import { formatDateTime } from '../utils';

// Status badge component
const StatusBadge: React.FC<{ status: JobStatus }> = ({ status }) => {
  const config: Record<JobStatus, { icon: React.ReactNode; className: string }> = {
    QUEUED: {
      icon: <Clock className="w-3.5 h-3.5" />,
      className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    },
    RUNNING: {
      icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
      className: 'bg-blue-100 text-blue-700 border-blue-200',
    },
    SUCCEEDED: {
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      className: 'bg-green-100 text-green-700 border-green-200',
    },
    FAILED: {
      icon: <XCircle className="w-3.5 h-3.5" />,
      className: 'bg-red-100 text-red-700 border-red-200',
    },
  };

  const { icon, className } = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${className}`}
    >
      {icon}
      {status}
    </span>
  );
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<ApiJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await intakeApi.getJobs(20); // Get last 20 jobs
      setJobs(data);
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
      setError('Failed to load jobs from the server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const columns: Column<ApiJob>[] = [
    {
      key: 'jobId',
      header: 'Job ID',
      render: (value) => (
        <span className="font-mono text-sm text-gray-600">{String(value).slice(0, 8)}...</span>
      ),
    },
    {
      key: 'analysisType',
      header: 'Analysis Type',
      render: (value) => (
        <span className="font-medium text-gray-900">{value}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: JobStatus) => <StatusBadge status={value} />,
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (value) => (
        <span className="text-gray-600">{formatDateTime(value)}</span>
      ),
    },
  ];

  // Calculate stats
  const stats = {
    total: jobs.length,
    succeeded: jobs.filter((j) => j.status === 'SUCCEEDED').length,
    running: jobs.filter((j) => j.status === 'RUNNING').length,
    failed: jobs.filter((j) => j.status === 'FAILED').length,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Monitor your analytics jobs and results
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={fetchJobs}
            isLoading={isLoading}
          >
            Refresh
          </Button>
          <Button
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => navigate('/analytics/intake')}
          >
            New Analysis
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="bordered">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Jobs</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card variant="bordered">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Succeeded</p>
              <p className="text-2xl font-bold text-green-600">{stats.succeeded}</p>
            </div>
          </div>
        </Card>
        <Card variant="bordered">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Running</p>
              <p className="text-2xl font-bold text-blue-600">{stats.running}</p>
            </div>
          </div>
        </Card>
        <Card variant="bordered">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Failed</p>
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card variant="elevated" padding="lg">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="primary"
              leftIcon={<BarChart3 className="w-4 h-4" />}
              onClick={() => navigate('/analytics/intake')}
            >
              Intake Analytics Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Jobs Table */}
      <Card variant="bordered" padding="none">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Jobs</h2>
        </div>
        {error ? (
          <div className="p-8 text-center">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-gray-600">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={fetchJobs}>
              Try Again
            </Button>
          </div>
        ) : (
          <Table
            columns={columns}
            data={jobs}
            keyExtractor={(job) => job.jobId}
            isLoading={isLoading}
            emptyMessage="No analytics jobs yet. Create your first analysis!"
          />
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
