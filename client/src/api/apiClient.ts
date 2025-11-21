/**
 * API Client
 * Centralized API communication with authentication handling
 */

const API_BASE_URL = '/api/v1';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: any;
}

/**
 * Make authenticated API request
 */
async function fetchApi<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: 'include', // Include cookies for authentication
  };

  try {
    const response = await fetch(url, config);

    // Handle non-OK responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: 'Request failed',
        message: response.statusText,
      }));

      throw new Error(errorData.message || errorData.error || 'Request failed');
    }

    // Parse JSON response
    const data = await response.json();

    return data;
  } catch (error) {
    console.error(`[ApiClient] Error fetching ${endpoint}:`, error);
    throw error;
  }
}

/**
 * API client methods
 */
export const apiClient = {
  // User Profile
  async getProfile() {
    return fetchApi('/users/profile');
  },

  async updateProfile(data: {
    role?: string;
    language?: string;
    customInstructions?: string;
    preferredStyle?: string;
  }) {
    return fetchApi('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Translation History
  async getTranslationHistory(params?: {
    limit?: number;
    cursor?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.cursor) queryParams.append('cursor', params.cursor);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);

    const query = queryParams.toString();
    return fetchApi(`/translations/history${query ? `?${query}` : ''}`);
  },

  async getTranslationStats() {
    return fetchApi('/translations/stats');
  },

  // Admin - Settings
  async getAdminSettings() {
    return fetchApi('/admin/settings');
  },

  async updateAdminSettings(data: {
    defaultLanguage?: string;
    defaultStyle?: string;
    rateLimitPerMinute?: number;
    cacheTTL?: number;
    llmProvider?: string;
  }) {
    return fetchApi('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Admin - Users
  async getAdminUsers() {
    return fetchApi('/admin/users');
  },

  async updateAdminUser(
    userId: string,
    data: {
      role?: string;
      isAdmin?: boolean;
    }
  ) {
    return fetchApi(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Admin - Cache
  async getCacheStats() {
    return fetchApi('/admin/cache/stats');
  },

  async clearCache() {
    return fetchApi('/admin/cache', {
      method: 'DELETE',
    });
  },
};

export default apiClient;
