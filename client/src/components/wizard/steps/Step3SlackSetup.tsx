/**
 * Step 3: Slack App Setup Instructions
 * Provides guidance for creating Slack App and collecting credentials.
 */

import React, { useState } from 'react';
import { useWizardStore } from '../../../store/wizardStore';

const Step3SlackSetup: React.FC = () => {
  const { formData, updateFormData, clearValidationError } = useWizardStore();
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);

  const requiredScopes = [
    'chat:write',
    'commands',
    'users:read',
    'channels:history',
    'groups:history',
  ];

  const oauthRedirectUrl = `${window.location.origin}/api/v1/slack/oauth`;

  const handleInputChange = (field: string, value: string) => {
    updateFormData({ [field]: value } as any);
    clearValidationError(field);
    setSaveResult(null);
  };

  const saveConfiguration = async () => {
    if (!formData.slackAppId || !formData.slackClientId || !formData.slackClientSecret || !formData.slackSigningSecret) {
      setSaveResult({
        success: false,
        message: 'Please fill in all required fields',
      });
      return;
    }

    setSaving(true);
    setSaveResult(null);

    try {
      const response = await fetch('/api/v1/setup/slack-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appId: formData.slackAppId,
          clientId: formData.slackClientId,
          clientSecret: formData.slackClientSecret,
          signingSecret: formData.slackSigningSecret,
        }),
      });

      if (response.ok) {
        setSaveResult({
          success: true,
          message: 'Slack configuration saved successfully!',
        });
      } else {
        const error = await response.json();
        setSaveResult({
          success: false,
          message: error.message || 'Failed to save configuration',
        });
      }
    } catch (error) {
      setSaveResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to save configuration',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Slack App Setup
        </h2>
        <p className="text-gray-600">
          Configure your Slack App credentials to connect Threadle to your workspace.
        </p>
      </div>

      {/* Setup Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">
          Step-by-Step Guide
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-blue-800">
          <li>
            Go to{' '}
            <a
              href="https://api.slack.com/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline hover:text-blue-600"
            >
              api.slack.com/apps
            </a>
          </li>
          <li>Click "Create New App" and select "From scratch"</li>
          <li>Enter app name (e.g., "Threadle") and select your workspace</li>
          <li>Go to "OAuth & Permissions" and add the scopes listed below</li>
          <li>Set the OAuth Redirect URL (shown below)</li>
          <li>Copy your App ID, Client ID, Client Secret, and Signing Secret</li>
        </ol>
      </div>

      {/* Required Scopes */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">
          Required Bot Token Scopes
        </h3>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="flex flex-wrap gap-2">
            {requiredScopes.map((scope) => (
              <span
                key={scope}
                className="px-3 py-1 bg-white border border-gray-300 rounded-full text-sm font-mono text-gray-700"
              >
                {scope}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* OAuth Redirect URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          OAuth Redirect URL
        </label>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={oauthRedirectUrl}
            readOnly
            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-mono text-sm"
          />
          <button
            onClick={() => navigator.clipboard.writeText(oauthRedirectUrl)}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-sm"
          >
            Copy
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Add this URL in your Slack App's "OAuth & Permissions" settings.
        </p>
      </div>

      {/* App ID */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          App ID
        </label>
        <input
          type="text"
          value={formData.slackAppId}
          onChange={(e) => handleInputChange('slackAppId', e.target.value)}
          placeholder="A01234567"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          Found in your app's "Basic Information" page.
        </p>
      </div>

      {/* Client ID */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Client ID
        </label>
        <input
          type="text"
          value={formData.slackClientId}
          onChange={(e) => handleInputChange('slackClientId', e.target.value)}
          placeholder="1234567890.1234567890"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          Found in "Basic Information" under "App Credentials".
        </p>
      </div>

      {/* Client Secret */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Client Secret
        </label>
        <input
          type="password"
          value={formData.slackClientSecret}
          onChange={(e) => handleInputChange('slackClientSecret', e.target.value)}
          placeholder="Enter client secret..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          Found in "Basic Information" under "App Credentials" (click "Show").
        </p>
      </div>

      {/* Signing Secret */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Signing Secret
        </label>
        <input
          type="password"
          value={formData.slackSigningSecret}
          onChange={(e) => handleInputChange('slackSigningSecret', e.target.value)}
          placeholder="Enter signing secret..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          Found in "Basic Information" under "App Credentials".
        </p>
      </div>

      {/* Save Button */}
      <div>
        <button
          onClick={saveConfiguration}
          disabled={saving}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      {/* Save Result */}
      {saveResult && (
        <div className={`p-4 rounded-lg ${
          saveResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center">
            {saveResult.success ? (
              <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className={`text-sm ${saveResult.success ? 'text-green-800' : 'text-red-800'}`}>
              {saveResult.message}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Step3SlackSetup;
