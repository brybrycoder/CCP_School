import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthenticator, Authenticator } from '@aws-amplify/ui-react';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute component that wraps content requiring authentication.
 * Redirects to login if user is not authenticated.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const location = useLocation();
  const { authStatus } = useAuthenticator((context) => [context.authStatus]);

  // Show loading spinner while checking auth status
  if (authStatus === 'configuring') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (authStatus !== 'authenticated') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

/**
 * AuthenticatorWrapper provides the Amplify Authenticator UI for login/signup.
 * Used on the /login route.
 */
export const AuthenticatorWrapper: React.FC = () => {
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">DAaaS Platform</h1>
          <p className="text-gray-600">Data Analytics as a Service</p>
        </div>
        <Authenticator
          signUpAttributes={['email']}
          loginMechanisms={['email']}
        >
          {() => <Navigate to={from} replace />}
        </Authenticator>
      </div>
    </div>
  );
};

export default ProtectedRoute;
