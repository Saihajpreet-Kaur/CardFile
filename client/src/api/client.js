import axios from 'axios';

export const TOKEN_KEY = 'crm_token'; // the server-rendered home page reads the same key

/**
 * One Axios instance for the whole app.
 * - baseURL: "/api" in development (Vite proxies it to Express), or VITE_API_URL when deployed separately
 * - a request interceptor adds the JWT to every request
 * - a response interceptor turns API errors into plain Error objects with status and field details
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30_000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status ?? 0;
    const body = error.response?.data;
    const message =
      body?.message ||
      (status === 0 ? 'Cannot reach the server. Is the API running?' : `Request failed (${status})`);

    // An expired or invalid token: tell the AuthContext to sign the user out
    if (status === 401 && localStorage.getItem(TOKEN_KEY)) {
      window.dispatchEvent(new Event('crm:unauthorized'));
    }
    return Promise.reject(new ApiError(message, status, body?.details));
  },
);

export default api;
