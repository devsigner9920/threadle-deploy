/**
 * Dashboard Page
 * Main dashboard shown after authentication
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '../components/layout/MainLayout';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/apiClient';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  // Fetch translation stats
  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['translation-stats'],
    queryFn: () => apiClient.getTranslationStats(),
  });

  // Fetch admin settings if user is admin
  const { data: adminData } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => apiClient.getAdminSettings(),
    enabled: user?.isAdmin || false,
  });

  const stats = statsData?.stats;
  const recentTranslations = stats?.recentTranslations || [];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Welcome back! Your Threadle bot is active and ready to translate.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Bot Status */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-green-500 text-white">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Bot Status</h3>
                <p className="text-sm text-gray-600">Connected and Active</p>
              </div>
            </div>
          </div>

          {/* Total Translations */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Translations</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoadingStats ? '...' : stats?.totalTranslations || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Tokens Used */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-purple-500 text-white">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Tokens Used</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoadingStats ? '...' : (stats?.totalTokensUsed || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Translations */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Recent Translations</h2>
            <Link
              to="/history"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View All
            </Link>
          </div>

          {isLoadingStats ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : recentTranslations.length === 0 ? (
            <p className="text-gray-600 text-center py-8">
              No translations yet. Try using /explain in Slack!
            </p>
          ) : (
            <div className="space-y-4">
              {recentTranslations.map((translation: any) => (
                <div
                  key={translation.id}
                  className="border-l-4 border-blue-500 pl-4 py-2"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 line-clamp-2">
                        {translation.content}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {translation.targetRole} • {new Date(translation.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Link
            to="/profile"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Edit Your Profile
            </h3>
            <p className="text-sm text-gray-600">
              Customize your role, language preferences, and translation style.
            </p>
          </Link>

          {user?.isAdmin && (
            <Link
              to="/admin"
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Admin Settings
              </h3>
              <p className="text-sm text-gray-600">
                Manage global settings, users, and system configuration.
              </p>
            </Link>
          )}
        </div>

        {/* Admin Info */}
        {user?.isAdmin && adminData?.success && (
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">
              System Configuration
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700">LLM Provider:</span>{' '}
                <span className="font-medium text-blue-900">
                  {adminData.settings?.llmProvider || 'Not configured'}
                </span>
              </div>
              <div>
                <span className="text-blue-700">Default Language:</span>{' '}
                <span className="font-medium text-blue-900">
                  {adminData.settings?.defaultLanguage || 'English'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Dashboard;
