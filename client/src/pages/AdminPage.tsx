/**
 * Admin Page
 * Admin-only settings and user management
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '../components/layout/MainLayout';
import apiClient from '../api/apiClient';

const AdminPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'settings' | 'users' | 'cache'>('settings');

  // Fetch admin settings
  const { data: settingsData, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => apiClient.getAdminSettings(),
  });

  // Fetch users
  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => apiClient.getAdminUsers(),
  });

  // Fetch cache stats
  const { data: cacheData, isLoading: isLoadingCache } = useQuery({
    queryKey: ['admin-cache'],
    queryFn: () => apiClient.getCacheStats(),
  });

  const settings = settingsData?.settings;
  const users = usersData?.users || [];
  const cacheStats = cacheData?.stats;

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    defaultLanguage: settings?.defaultLanguage || 'English',
    defaultStyle: settings?.defaultStyle || 'ELI5',
    rateLimitPerMinute: settings?.rateLimitPerMinute || 10,
    cacheTTL: settings?.cacheTTL || 3600,
    llmProvider: settings?.llmProvider || 'openai',
  });

  // Update form when settings load
  React.useEffect(() => {
    if (settings) {
      setSettingsForm({
        defaultLanguage: settings.defaultLanguage || 'English',
        defaultStyle: settings.defaultStyle || 'ELI5',
        rateLimitPerMinute: settings.rateLimitPerMinute || 10,
        cacheTTL: settings.cacheTTL || 3600,
        llmProvider: settings.llmProvider || 'openai',
      });
    }
  }, [settings]);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (data: typeof settingsForm) => apiClient.updateAdminSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      setSuccessMessage('Settings updated successfully!');
      setErrorMessage('');
      setTimeout(() => setSuccessMessage(''), 3000);
    },
    onError: (error: Error) => {
      setErrorMessage(error.message || 'Failed to update settings');
      setSuccessMessage('');
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: any }) =>
      apiClient.updateAdminUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setSuccessMessage('User updated successfully!');
      setErrorMessage('');
      setTimeout(() => setSuccessMessage(''), 3000);
    },
    onError: (error: Error) => {
      setErrorMessage(error.message || 'Failed to update user');
      setSuccessMessage('');
    },
  });

  // Clear cache mutation
  const clearCacheMutation = useMutation({
    mutationFn: () => apiClient.clearCache(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cache'] });
      setSuccessMessage('Cache cleared successfully!');
      setErrorMessage('');
      setTimeout(() => setSuccessMessage(''), 3000);
    },
    onError: (error: Error) => {
      setErrorMessage(error.message || 'Failed to clear cache');
      setSuccessMessage('');
    },
  });

  const handleSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate(settingsForm);
  };

  const handleToggleAdmin = (userId: string, currentIsAdmin: boolean) => {
    if (confirm(`Are you sure you want to ${currentIsAdmin ? 'remove' : 'grant'} admin privileges?`)) {
      updateUserMutation.mutate({
        userId,
        data: { isAdmin: !currentIsAdmin },
      });
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Settings</h1>
          <p className="mt-2 text-gray-600">
            Manage system configuration, users, and cache.
          </p>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="rounded-md bg-green-50 p-4">
            <p className="text-sm font-medium text-green-800">{successMessage}</p>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">{errorMessage}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {['settings', 'users', 'cache'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            {isLoadingSettings ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <form onSubmit={handleSettingsSubmit} className="space-y-6">
                {/* LLM Provider */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    LLM Provider
                  </label>
                  <select
                    value={settingsForm.llmProvider}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, llmProvider: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                  >
                    <option value="openai">OpenAI (GPT-4)</option>
                    <option value="anthropic">Anthropic (Claude)</option>
                    <option value="google">Google (Gemini)</option>
                  </select>
                </div>

                {/* Default Language */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Default Language
                  </label>
                  <select
                    value={settingsForm.defaultLanguage}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, defaultLanguage: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                  >
                    <option value="English">English</option>
                    <option value="Spanish">Spanish</option>
                    <option value="French">French</option>
                    <option value="German">German</option>
                  </select>
                </div>

                {/* Default Style */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Default Translation Style
                  </label>
                  <select
                    value={settingsForm.defaultStyle}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, defaultStyle: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                  >
                    <option value="ELI5">ELI5</option>
                    <option value="Business Summary">Business Summary</option>
                    <option value="Technical Lite">Technical Lite</option>
                    <option value="Analogies Only">Analogies Only</option>
                  </select>
                </div>

                {/* Rate Limit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Rate Limit (requests/minute)
                  </label>
                  <input
                    type="number"
                    value={settingsForm.rateLimitPerMinute}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        rateLimitPerMinute: parseInt(e.target.value),
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                  />
                </div>

                {/* Cache TTL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Cache TTL (seconds)
                  </label>
                  <input
                    type="number"
                    value={settingsForm.cacheTTL}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        cacheTTL: parseInt(e.target.value),
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                  />
                </div>

                {/* Submit */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={updateSettingsMutation.isPending}
                    className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {isLoadingUsers ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Slack User ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Language
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Admin
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user: any) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.slackUserId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.role?.replace(/_/g, ' ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.language}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.isAdmin ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Admin
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">No</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => handleToggleAdmin(user.id, user.isAdmin)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          {user.isAdmin ? 'Remove Admin' : 'Make Admin'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Cache Tab */}
        {activeTab === 'cache' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              {isLoadingCache ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-900">Cache Statistics</h2>

                  <dl className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                    <div className="px-4 py-5 bg-gray-50 rounded-lg">
                      <dt className="text-sm font-medium text-gray-500">Hit Rate</dt>
                      <dd className="mt-1 text-3xl font-semibold text-gray-900">
                        {cacheStats?.hitRatePercentage || '0%'}
                      </dd>
                    </div>

                    <div className="px-4 py-5 bg-gray-50 rounded-lg">
                      <dt className="text-sm font-medium text-gray-500">Cache Size</dt>
                      <dd className="mt-1 text-3xl font-semibold text-gray-900">
                        {cacheStats?.size || 0}
                      </dd>
                    </div>

                    <div className="px-4 py-5 bg-gray-50 rounded-lg">
                      <dt className="text-sm font-medium text-gray-500">Total Requests</dt>
                      <dd className="mt-1 text-3xl font-semibold text-gray-900">
                        {cacheStats?.totalRequests || 0}
                      </dd>
                    </div>
                  </dl>

                  <div className="pt-4">
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to clear all cached translations?')) {
                          clearCacheMutation.mutate();
                        }
                      }}
                      disabled={clearCacheMutation.isPending}
                      className="inline-flex justify-center rounded-md border border-transparent bg-red-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                      {clearCacheMutation.isPending ? 'Clearing...' : 'Clear Cache'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default AdminPage;
