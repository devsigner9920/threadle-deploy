/**
 * Setup Status Hook
 * Fetches and provides the current setup status from the backend.
 */

import { useState, useEffect } from 'react';

interface SetupStatus {
  isFirstTimeSetup: boolean;
  setupCompleted: boolean;
  hasSecrets: boolean;
}

export const useSetupStatus = () => {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/config/status');

      if (!response.ok) {
        throw new Error('Failed to fetch setup status');
      }

      const data = await response.json();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching setup status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return {
    status,
    isLoading,
    error,
    refetch: fetchStatus,
  };
};
