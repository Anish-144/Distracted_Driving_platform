import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosResponse,
  CanceledError,
} from 'axios';

// Use relative path to leverage Next.js rewrites/proxies
const API_BASE_URL = '/api';

const client: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ─── Request Interceptor — attach JWT ────────────────────────────────────────
client.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor — handle 401 ───────────────────────────────────────
client.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    // Do NOT redirect on cancelled requests (AbortController cleanup)
    if (axios.isCancel(error)) return Promise.reject(error);

    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('auth_user');
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── Helper: detect if an error is a request cancellation ────────────────────
// Use this in catch blocks to silently ignore AbortController / Strict Mode cleanup.
export function isRequestCancelled(err: unknown): boolean {
  return axios.isCancel(err);
}

export default client;
