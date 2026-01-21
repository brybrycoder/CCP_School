# DAaaS Platform Frontend

A production-ready React application for a Data Analytics as a Service (DAaaS) platform, built with AWS Serverless architecture integration.

## 🚀 Tech Stack

- **Framework:** React 18 + Vite + TypeScript
- **Styling:** Tailwind CSS
- **Networking:** Axios with JWT interceptors
- **Visualization:** Recharts
- **Authentication:** AWS Amplify (Cognito)
- **Routing:** React Router DOM v6
- **Icons:** Lucide React

## 📁 Project Structure

```
/src
  /api           # Axios client & API endpoints
    client.ts    # Axios instance with auth interceptors
    endpoints.ts # Type-safe API endpoint functions
  /components
    /ui          # Reusable atoms (Button, Card, Table)
    /charts      # Recharts wrappers (LineChart, BarChart)
    /layout      # Navbar, Sidebar, ProtectedRoute, MainLayout
  /pages         # Dashboard, IntakeAnalytics, Login
  /types         # TypeScript definitions & schema
  /utils         # Formatters, helpers
```

## 🔧 Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- AWS Account (for Cognito)

### Installation

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Update .env with your AWS Cognito credentials
```

### Environment Variables

Create a `.env` file with the following:

```env
VITE_API_URL=https://your-api-gateway-url.execute-api.region.amazonaws.com/prod
VITE_AWS_REGION=ap-southeast-1
VITE_USER_POOL_ID=your-cognito-user-pool-id
VITE_USER_POOL_CLIENT_ID=your-cognito-user-pool-client-id
```

### Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📊 Features

### Dashboard (`/`)
- View all analytics jobs
- Job status tracking (Queued, Running, Succeeded, Failed)
- Quick navigation to Intake Analytics

### Intake Analytics (`/analytics/intake`)
- **Control Panel:**
  - Multi-select institution checkboxes (grouped by Universities, Polytechnics, Arts)
  - Year range selection (1982-2023)
  - Gender filter (All/Female/Male)
  - Analysis mode toggle (Trend vs Comparison)

- **Visualizations:**
  - **Trend Mode:** Line chart showing intake over time
  - **Comparison Mode:** Horizontal bar chart comparing institutions

- **Data Table:** Raw data display with sorting

## 🔐 Authentication

The app uses AWS Amplify with Cognito for authentication:

- Email-based authentication
- Protected routes redirect to `/login`
- JWT tokens automatically attached to API requests

## 📋 Data Schema

The application strictly follows this data contract:

```typescript
interface Job {
  jobId: string;
  userId: string;
  datasetId: string;
  analysisType: string;
  params: Record<string, any>;
  status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  createdAt: string;
  updatedAt: string;
  result?: { s3Bucket: string; s3Key: string };
  error?: string | null;
}

interface AnalyticsResult {
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
```

## 🏫 Supported Institutions

**Universities:**
- NUS, NTU, SMU, SIT, SUTD, SUSS

**Polytechnics:**
- Singapore Poly, Ngee Ann Poly, Temasek Poly, Nanyang Poly, Republic Poly

**Arts & Others:**
- NIE, ITE, LASALLE (Diploma/Degree), NAFA (Diploma/Degree)

## 📝 License

MIT
