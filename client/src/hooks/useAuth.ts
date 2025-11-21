/**
 * useAuth Hook
 * Custom hook for authentication logic
 */

import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import apiClient from '../api/apiClient';

export function useAuth() {
  const { user, isAuthenticated, isLoading, error, setUser, setLoading, setError, logout } =
    useAuthStore();

  // Load user profile on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        const response = await apiClient.getProfile();

        if (response.success && response.profile) {
          setUser(response.profile);
        } else {
          setError('Failed to load user profile');
        }
      } catch (err) {
        // User not authenticated or error occurred
        console.log('[useAuth] Not authenticated:', err);
        setUser(null);
      }
    };

    loadUser();
  }, [setUser, setLoading, setError]);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    logout,
  };
}

export default useAuth;
