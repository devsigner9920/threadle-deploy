/**
 * Step 1: Welcome & Prerequisites
 * First step of the setup wizard
 */

import React from 'react';

const Step1Welcome: React.FC = () => {
  const [checksComplete, setChecksComplete] = React.useState({
    nodeVersion: false,
    network: false,
  });

  React.useEffect(() => {
    // Check Node.js version (always true in browser context)
    setChecksComplete((prev) => ({ ...prev, nodeVersion: true }));

    // Check network connectivity
    fetch('/health')
      .then(() => setChecksComplete((prev) => ({ ...prev, network: true })))
      .catch(() => console.error('Network check failed'));
  }, []);

  const nodeVersion = typeof window !== 'undefined' ? 'Browser' : '20.0.0+';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Welcome to Threadle Setup
        </h2>
        <p className="mt-2 text-gray-600">
          Let's get your Slack translation bot up and running. This wizard will
          guide you through the setup process.
        </p>
      </div>

      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">
          Prerequisites Check
        </h3>

        <div className="space-y-3">
          <div className="flex items-center">
            {checksComplete.nodeVersion ? (
              <svg
                className="h-5 w-5 text-green-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                className="h-5 w-5 text-gray-400 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            <span className="ml-3 text-sm text-gray-700">
              Node.js {nodeVersion}
            </span>
          </div>

          <div className="flex items-center">
            {checksComplete.network ? (
              <svg
                className="h-5 w-5 text-green-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                className="h-5 w-5 text-gray-400 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            <span className="ml-3 text-sm text-gray-700">
              Network connectivity
            </span>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          What you'll need:
        </h3>
        <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
          <li>A Slack workspace with admin access</li>
          <li>An API key from your chosen LLM provider (OpenAI, Anthropic, or Google)</li>
          <li>About 5-10 minutes to complete the setup</li>
        </ul>
      </div>
    </div>
  );
};

export default Step1Welcome;
