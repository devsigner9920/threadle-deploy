/**
 * Step 4: Slack OAuth Installation Flow
 * Handles OAuth authorization to install Threadle to Slack workspace.
 */

import React, { useEffect, useState } from 'react';
import { useWizardStore } from '../../../store/wizardStore';

const Step4OAuth: React.FC = () => {
  const { formData, updateFormData } = useWizardStore();
  const [oauthUrl, setOauthUrl] = useState<string>('');

  useEffect(() => {
    // Check if OAuth was completed (from redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const oauthSuccess = urlParams.get('oauth') === 'success';

    if (oauthSuccess && !formData.slackOAuthCompleted) {
      updateFormData({ slackOAuthCompleted: true });
    }

    // Generate OAuth URL
    if (formData.slackClientId) {
      const redirectUri = `${window.location.origin}/api/v1/slack/oauth`;
      const scopes = 'chat:write,commands,users:read,channels:history,groups:history';
      const url = `https://slack.com/oauth/v2/authorize?client_id=${formData.slackClientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}`;
      setOauthUrl(url);
    }
  }, [formData.slackClientId, formData.slackOAuthCompleted]);

  const handleInstallClick = () => {
    if (oauthUrl) {
      window.location.href = oauthUrl;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Install to Workspace
        </h2>
        <p className="text-gray-600">
          Connect Threadle to your Slack workspace via OAuth.
        </p>
      </div>

      {!formData.slackOAuthCompleted ? (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              What happens next?
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-blue-800">
              <li>You'll be redirected to Slack to authorize the app</li>
              <li>Select the workspace where you want to install Threadle</li>
              <li>Review and approve the requested permissions</li>
              <li>You'll be redirected back here automatically</li>
            </ol>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <div className="mb-4">
              <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Ready to Install
            </h3>
            <p className="text-gray-600 mb-4">
              Click the button below to authorize Threadle in your Slack workspace.
            </p>
            <button
              onClick={handleInstallClick}
              disabled={!oauthUrl}
              className="inline-flex items-center px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
              </svg>
              Install to Slack
            </button>
          </div>

          {!formData.slackClientId && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-sm text-yellow-800">
                  Please complete Step 3 to configure your Slack credentials before installing.
                </span>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <div className="mb-4">
            <svg className="mx-auto h-16 w-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-green-900 mb-2">
            Successfully Connected!
          </h3>
          <p className="text-green-800 mb-2">
            Threadle has been installed to your Slack workspace.
          </p>
          {formData.slackWorkspaceName && (
            <p className="text-green-700 text-sm">
              Workspace: <strong>{formData.slackWorkspaceName}</strong>
            </p>
          )}
          <div className="mt-6">
            <p className="text-sm text-green-700">
              Click "Next" to continue with global settings.
            </p>
          </div>
        </div>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">
          Permissions Requested
        </h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li><strong>chat:write</strong> - Send messages as the bot</li>
          <li><strong>commands</strong> - Add slash commands like /explain</li>
          <li><strong>users:read</strong> - View user profiles for role detection</li>
          <li><strong>channels:history</strong> - Read channel messages for context</li>
          <li><strong>groups:history</strong> - Read private channel messages</li>
        </ul>
      </div>
    </div>
  );
};

export default Step4OAuth;
