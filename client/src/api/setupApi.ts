/**
 * Setup API Client
 * Handles API calls related to wizard setup completion.
 */

export interface CompleteSetupPayload {
  llmProvider: string;
  slackAppId: string;
  slackClientId: string;
  slackWorkspaceId: string;
  defaultStyle: string;
  defaultLanguage: string;
  rateLimitPerMinute: number;
  cacheTTL: number;
}

export const completeSetup = async (
  payload: CompleteSetupPayload
): Promise<void> => {
  const response = await fetch('/api/v1/setup/complete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || 'Failed to complete setup');
  }
};

export const getSetupStatus = async () => {
  const response = await fetch('/config/status');

  if (!response.ok) {
    throw new Error('Failed to fetch setup status');
  }

  return response.json();
};
