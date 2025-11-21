/**
 * Step 6: Admin Account Creation & Completion
 * Create the first admin user and display completion message.
 */

import React, { useState } from 'react';
import { useWizardStore } from '../../../store/wizardStore';

const Step6Complete: React.FC = () => {
  const { formData, updateFormData, clearValidationError } = useWizardStore();
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSlackUserIdChange = (value: string) => {
    updateFormData({ adminSlackUserId: value });
    clearValidationError('adminSlackUserId');
    setCreateResult(null);
  };

  const createAdminUser = async () => {
    if (!formData.adminSlackUserId) {
      setCreateResult({
        success: false,
        message: 'Please enter a Slack User ID',
      });
      return;
    }

    if (!formData.slackWorkspaceId) {
      setCreateResult({
        success: false,
        message: 'Workspace ID is missing. Please complete OAuth setup first.',
      });
      return;
    }

    setCreating(true);
    setCreateResult(null);

    try {
      const response = await fetch('/api/v1/setup/admin-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slackUserId: formData.adminSlackUserId,
          slackWorkspaceId: formData.slackWorkspaceId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCreateResult({
          success: true,
          message: `Admin user created successfully! User ID: ${data.userId}`,
        });
      } else {
        const error = await response.json();
        setCreateResult({
          success: false,
          message: error.message || 'Failed to create admin user',
        });
      }
    } catch (error) {
      setCreateResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create admin user',
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Admin Account Setup
        </h2>
        <p className="text-gray-600">
          Create your admin account to manage Threadle settings and users.
        </p>
      </div>

      {/* Slack User ID Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your Slack User ID
        </label>
        <input
          type="text"
          value={formData.adminSlackUserId}
          onChange={(e) => handleSlackUserIdChange(e.target.value)}
          placeholder="U01234567"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          This will be the first admin user with full access to settings.
        </p>
      </div>

      {/* How to find Slack User ID */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">
          How to find your Slack User ID:
        </h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
          <li>In Slack, click on your profile picture</li>
          <li>Click "Profile" from the menu</li>
          <li>Click the three dots (More actions)</li>
          <li>Select "Copy member ID"</li>
        </ol>
      </div>

      {/* Create Admin Button */}
      <div>
        <button
          onClick={createAdminUser}
          disabled={creating || !formData.adminSlackUserId}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {creating ? 'Creating Admin User...' : 'Create Admin User'}
        </button>
      </div>

      {/* Create Result */}
      {createResult && (
        <div className={`p-4 rounded-lg ${
          createResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center">
            {createResult.success ? (
              <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className={`text-sm ${createResult.success ? 'text-green-800' : 'text-red-800'}`}>
              {createResult.message}
            </span>
          </div>
        </div>
      )}

      {/* Completion Info */}
      {createResult?.success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-3">
            You're All Set!
          </h3>
          <p className="text-green-800 mb-4">
            Threadle is now configured and ready to use. Here's what you can do next:
          </p>

          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">
                1. Use Slash Commands in Slack
              </h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li><code className="bg-gray-100 px-2 py-1 rounded">/explain</code> - Get AI explanations of thread discussions</li>
                <li><code className="bg-gray-100 px-2 py-1 rounded">/setprofile</code> - Set your role and preferences</li>
                <li><code className="bg-gray-100 px-2 py-1 rounded">/help</code> - Get help and usage instructions</li>
              </ul>
            </div>

            <div className="bg-white rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">
                2. Access the Web Dashboard
              </h4>
              <p className="text-sm text-gray-700">
                Visit the dashboard to manage settings, view translation history, and add more users.
              </p>
            </div>

            <div className="bg-white rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">
                3. Invite Your Team
              </h4>
              <p className="text-sm text-gray-700">
                Encourage team members to use <code className="bg-gray-100 px-2 py-1 rounded">/setprofile</code> to
                customize their experience based on their role.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Documentation Link */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          Need Help?
        </h3>
        <p className="text-sm text-blue-800 mb-2">
          Check out the documentation for detailed usage guides and troubleshooting.
        </p>
        <a
          href="https://github.com/threadle/threadle#readme"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-blue-900 hover:text-blue-700 font-medium text-sm"
        >
          View Documentation
          <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      {/* Next Steps */}
      <div className="pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          Click "Complete Setup" to finish the wizard and go to the dashboard.
        </p>
      </div>
    </div>
  );
};

export default Step6Complete;
