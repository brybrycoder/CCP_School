import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Authenticator } from '@aws-amplify/ui-react';
import { BarChart3 } from 'lucide-react';
import '@aws-amplify/ui-react/styles.css';

// Component to handle redirect after authentication
const AuthenticatedRedirect: React.FC<{ redirectTo: string }> = ({ redirectTo }) => {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate(redirectTo, { replace: true });
  }, [navigate, redirectTo]);
  
  return <></>;
};

export const Login: React.FC = () => {
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4 shadow-lg">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            DAaaS Platform
          </h1>
          <p className="text-gray-600">
            Data Analytics as a Service
          </p>
        </div>

        {/* Authenticator */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <Authenticator
            signUpAttributes={['email']}
            loginMechanisms={['email']}
            components={{
              Header() {
                return (
                  <div className="px-6 pt-6 pb-2">
                    <h2 className="text-xl font-semibold text-gray-900 text-center">
                      Welcome Back
                    </h2>
                    <p className="text-sm text-gray-500 text-center mt-1">
                      Sign in to access your analytics dashboard
                    </p>
                  </div>
                );
              },
            }}
          >
            <AuthenticatedRedirect redirectTo={from} />
          </Authenticator>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Powered by AWS Serverless Architecture
        </p>
      </div>
    </div>
  );
};

export default Login;
