import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Authenticator } from '@aws-amplify/ui-react';
import { Amplify } from 'aws-amplify';

// Layout Components
import { MainLayout, ProtectedRoute } from './components/layout';

// Pages
import { Dashboard, IntakeAnalytics, Login } from './pages';

// Amplify Configuration
const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_USER_POOL_ID || 'ap-southeast-1_XXXXXXXXX',
      userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID || 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
      signUpVerificationMethod: 'code' as const,
      loginWith: {
        email: true,
      },
    },
  },
};

// Configure Amplify
Amplify.configure(amplifyConfig);

// Development mode: Set to false to enable real authentication
const DEV_MODE = true;

/**
 * Main Application Component
 * 
 * Architecture:
 * - DEV_MODE bypasses authentication for testing
 * - Authenticator.Provider wraps the entire app for auth context (production)
 * - BrowserRouter provides routing capabilities
 * - ProtectedRoute ensures authentication before accessing protected pages
 * - MainLayout provides consistent navigation (Navbar + Sidebar)
 */
const App: React.FC = () => {
  if (DEV_MODE) {
    // Development mode - skip authentication
    return (
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/analytics/intake" element={<IntakeAnalytics />} />
            <Route path="*" element={<Dashboard />} />
          </Route>
        </Routes>
      </BrowserRouter>
    );
  }

  // Production mode - with authentication
  return (
    <Authenticator.Provider>
      <BrowserRouter>
        <Routes>
          {/* Public Route - Login */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes - Wrapped in MainLayout */}
          <Route
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            {/* Dashboard - Home */}
            <Route path="/" element={<Dashboard />} />

            {/* Intake Analytics Page */}
            <Route path="/analytics/intake" element={<IntakeAnalytics />} />

            {/* Catch-all for undefined routes within protected area */}
            <Route
              path="*"
              element={
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                  <p className="text-gray-600 mb-6">Page not found</p>
                  <a
                    href="/"
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Go back to Dashboard
                  </a>
                </div>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </Authenticator.Provider>
  );
};

export default App;
