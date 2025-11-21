/**
 * History Page
 * Shows user's translation history with pagination
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '../components/layout/MainLayout';
import apiClient from '../api/apiClient';

const HistoryPage: React.FC = () => {
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });

  // Fetch translation history
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['translation-history', cursor, dateRange],
    queryFn: () =>
      apiClient.getTranslationHistory({
        limit: 20,
        cursor,
        startDate: dateRange.startDate || undefined,
        endDate: dateRange.endDate || undefined,
      }),
  });

  const translations = data?.translations || [];
  const pagination = data?.pagination;

  const handleLoadMore = () => {
    if (pagination?.nextCursor) {
      setCursor(pagination.nextCursor);
    }
  };

  const handleResetFilters = () => {
    setDateRange({ startDate: '', endDate: '' });
    setCursor(undefined);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Translation History</h1>
          <p className="mt-2 text-gray-600">
            View and manage your past translations.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Filters</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="startDate"
                className="block text-sm font-medium text-gray-700"
              >
                Start Date
              </label>
              <input
                type="date"
                id="startDate"
                value={dateRange.startDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, startDate: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
              />
            </div>

            <div>
              <label
                htmlFor="endDate"
                className="block text-sm font-medium text-gray-700"
              >
                End Date
              </label>
              <input
                type="date"
                id="endDate"
                value={dateRange.endDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, endDate: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleResetFilters}
                className="w-full rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        {/* Translations List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : translations.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
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
              <p className="mt-4 text-gray-600">No translations found.</p>
              <p className="text-sm text-gray-500">
                Try using /explain in Slack to create your first translation!
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {translations.map((translation: any) => (
                <li key={translation.id} className="p-6 hover:bg-gray-50">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {translation.targetRole?.replace(/_/g, ' ')}
                        </span>
                        <span className="text-sm text-gray-500">
                          {translation.language}
                        </span>
                      </div>
                      <time className="text-sm text-gray-500">
                        {new Date(translation.timestamp).toLocaleString()}
                      </time>
                    </div>

                    {/* Original Message Snippet */}
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Original Message:
                      </p>
                      <p className="text-sm text-gray-600 italic">
                        {translation.conversationSnippet}
                      </p>
                    </div>

                    {/* Translated Content */}
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Translation:
                      </p>
                      <div className="mt-1 prose prose-sm max-w-none">
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">
                          {translation.translatedContent}
                        </p>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Provider: {translation.llmProvider}</span>
                      <span>Tokens: {translation.tokenUsage.toLocaleString()}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Load More Button */}
          {pagination?.hasMore && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <button
                onClick={handleLoadMore}
                disabled={isFetching}
                className="w-full inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isFetching ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default HistoryPage;
