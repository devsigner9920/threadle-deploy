/**
 * Main Application Component
 * Handles routing and authentication
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryProvider } from './providers/QueryProvider';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { useSetupStatus } from './hooks/useSetupStatus';

// Pages
import SetupWizard from './pages/SetupWizard';
import Dashboard from './pages/Dashboard';
import ProfilePage from './pages/ProfilePage';
import HistoryPage from './pages/HistoryPage';
import AdminPage from './pages/AdminPage';

const LoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

const ErrorScreen: React.FC<{ message: string }> = ({ message }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="bg-white rounded-lg shadow-md p-8 max-w-md">
      <div className="text-red-600 mb-4">
        <svg
          className="h-12 w-12 mx-auto"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
        Error Loading Application
      </h2>
      <p className="text-gray-600 text-center">{message}</p>
    </div>
  </div>
);

const AppRoutes: React.FC = () => {
  const { status, isLoading, error } = useSetupStatus();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen message={error} />;
  }

  // If setup is not completed, redirect to wizard
  if (status?.isFirstTimeSetup) {
    return (
      <Routes>
        <Route path="/wizard" element={<SetupWizard />} />
        <Route path="*" element={<Navigate to="/wizard" replace />} />
      </Routes>
    );
  }

  // Setup completed - show authenticated routes
  return (
    <Routes>
      {/* Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Profile */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />

      {/* History */}
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <HistoryPage />
          </ProtectedRoute>
        }
      />

      {/* Admin */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requireAdmin>
            <AdminPage />
          </ProtectedRoute>
        }
      />

      {/* Setup Wizard (redirect if already setup) */}
      <Route
        path="/wizard"
        element={
          status?.setupCompleted ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <SetupWizard />
          )
        }
      />

      {/* Default Route */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Catch-all Route */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <QueryProvider>
      <Router>
        <AppRoutes />
      </Router>
    </QueryProvider>
  );
};

export default App;
