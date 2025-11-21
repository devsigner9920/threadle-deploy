/**
 * Protected Route Component
 * Wraps routes that require authentication
 */

import React from 'react';
import { useAuth } from '../../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to OAuth if not authenticated
  if (!isAuthenticated) {
    // TODO: Redirect to Slack OAuth flow
    // For now, show a message
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Authentication Required
          </h2>
          <p className="text-gray-600 mb-4">
            You need to authenticate with Slack to access this page.
          </p>
          <button
            onClick={() => {
              // TODO: Trigger Slack OAuth
              window.location.href = '/api/v1/slack/oauth';
            }}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Sign in with Slack
          </button>
        </div>
      </div>
    );
  }

  // Check admin requirement
  if (requireAdmin && !user?.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Admin Access Required
          </h2>
          <p className="text-gray-600">
            You do not have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
