import axios from 'axios';
import {
  getAccessToken, getRefreshToken,
  saveTokens, clearAll, updateCachedToken,
} from '../utils/secureStorage';

/**
 * API base URL — adjust per environment:
 *   Web browser / iOS simulator : http://localhost:3000/api   ← active
 *   Android emulator            : http://10.0.2.2:3000/api
 *   Physical device             : http://<YOUR_LOCAL_IP>:3000/api
 */
export const API_BASE = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor — attach Bearer token ──────────────────────────────
api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor — silent token refresh on TOKEN_EXPIRED ───────────

let isRefreshing = false;
let pendingQueue = [];  // requests that arrived while a refresh was in flight

const flushQueue = (err, newToken = null) => {
  pendingQueue.forEach(({ resolve, reject }) =>
    err ? reject(err) : resolve(newToken)
  );
  pendingQueue = [];
};

// AuthContext registers this so the interceptor can force a logout
// when the refresh token itself has expired.
let _forceLogout = null;
export function setForceLogoutCallback(cb) {
  _forceLogout = cb;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    const shouldRefresh =
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !original._retry;

    if (!shouldRefresh) return Promise.reject(error);

    // Queue concurrent requests while a refresh is already running
    if (isRefreshing) {
      return new Promise((resolve, reject) =>
        pendingQueue.push({ resolve, reject })
      ).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing    = true;

    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) throw new Error('no_refresh_token');

      const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });

      await saveTokens(data.accessToken, refreshToken);
      updateCachedToken(data.accessToken);
      flushQueue(null, data.accessToken);

      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(original);
    } catch (err) {
      flushQueue(err);
      await clearAll();
      _forceLogout?.();
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
