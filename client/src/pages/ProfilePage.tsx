/**
 * Profile Page
 * Allows users to edit their profile settings
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '../components/layout/MainLayout';
import apiClient from '../api/apiClient';

const ProfilePage: React.FC = () => {
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch user profile
  const { data: profileData, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => apiClient.getProfile(),
  });

  const profile = profileData?.profile;

  // Form state
  const [formData, setFormData] = useState({
    role: profile?.role || '',
    language: profile?.language || '',
    preferredStyle: profile?.preferredStyle || '',
    customInstructions: profile?.customInstructions || '',
  });

  // Update form when profile loads
  React.useEffect(() => {
    if (profile) {
      setFormData({
        role: profile.role || '',
        language: profile.language || '',
        preferredStyle: profile.preferredStyle || '',
        customInstructions: profile.customInstructions || '',
      });
    }
  }, [profile]);

  // Mutation for updating profile
  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) => apiClient.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      setSuccessMessage('Profile updated successfully!');
      setErrorMessage('');
      setTimeout(() => setSuccessMessage(''), 3000);
    },
    onError: (error: Error) => {
      setErrorMessage(error.message || 'Failed to update profile');
      setSuccessMessage('');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User Profile</h1>
          <p className="mt-2 text-gray-600">
            Customize your profile to get personalized translations.
          </p>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-6 rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-green-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Profile Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role */}
            <div>
              <label
                htmlFor="role"
                className="block text-sm font-medium text-gray-700"
              >
                Role
              </label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
              >
                <option value="">Select a role</option>
                <option value="Engineering_Backend">Engineering - Backend</option>
                <option value="Engineering_Frontend">Engineering - Frontend</option>
                <option value="Engineering_Mobile">Engineering - Mobile</option>
                <option value="Design">Design</option>
                <option value="Product">Product</option>
                <option value="Marketing">Marketing</option>
                <option value="QA">QA</option>
                <option value="Data">Data</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Your professional role determines how translations are tailored.
              </p>
            </div>

            {/* Language */}
            <div>
              <label
                htmlFor="language"
                className="block text-sm font-medium text-gray-700"
              >
                Language
              </label>
              <select
                id="language"
                value={formData.language}
                onChange={(e) =>
                  setFormData({ ...formData, language: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
              >
                <option value="">Select a language</option>
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="German">German</option>
                <option value="Japanese">Japanese</option>
                <option value="Korean">Korean</option>
                <option value="Chinese">Chinese</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Preferred language for translations.
              </p>
            </div>

            {/* Preferred Style */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Translation Style
              </label>
              <div className="space-y-2">
                {['ELI5', 'Business Summary', 'Technical Lite', 'Analogies Only'].map(
                  (style) => (
                    <div key={style} className="flex items-center">
                      <input
                        id={style}
                        type="radio"
                        value={style}
                        checked={formData.preferredStyle === style}
                        onChange={(e) =>
                          setFormData({ ...formData, preferredStyle: e.target.value })
                        }
                        className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label
                        htmlFor={style}
                        className="ml-3 block text-sm font-medium text-gray-700"
                      >
                        {style}
                      </label>
                    </div>
                  )
                )}
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Choose how you want technical concepts explained.
              </p>
            </div>

            {/* Custom Instructions */}
            <div>
              <label
                htmlFor="customInstructions"
                className="block text-sm font-medium text-gray-700"
              >
                Custom Instructions
              </label>
              <textarea
                id="customInstructions"
                rows={4}
                value={formData.customInstructions}
                onChange={(e) =>
                  setFormData({ ...formData, customInstructions: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                placeholder="E.g., Always include code examples, Focus on business impact, etc."
              />
              <p className="mt-1 text-sm text-gray-500">
                Additional preferences for how you want translations formatted.
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  );
};

export default ProfilePage;
