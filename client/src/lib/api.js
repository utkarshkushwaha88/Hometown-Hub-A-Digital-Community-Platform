import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url || '';
    const isAuthRequest = requestUrl.includes('/auth/login')
      || requestUrl.includes('/auth/register')
      || requestUrl.includes('/auth/refresh')
      || requestUrl.includes('/auth/logout');

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthRequest) {
      originalRequest._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = axios.post(
            `${api.defaults.baseURL}/auth/refresh`,
            {},
            { withCredentials: true, headers: { 'Content-Type': 'application/json' } },
          ).finally(() => {
            refreshPromise = null;
          });
        }
        await refreshPromise;
        return api(originalRequest);
      } catch {
        // Clear stale client auth state so protected pages stop issuing requests.
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('hometownhub:session-expired'));
      }
    }

    const message = error?.response?.data?.message || error.message || 'Request failed';
    const normalizedError = new Error(message);
    normalizedError.status = error?.response?.status;
    normalizedError.response = error?.response;
    throw normalizedError;
  },
);
