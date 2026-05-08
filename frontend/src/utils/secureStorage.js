import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEY = {
  ACCESS_TOKEN:  'theatre_access_token',
  REFRESH_TOKEN: 'theatre_refresh_token',
  USER:          'theatre_user',
};

// expo-secure-store is not available on web — use localStorage as a fallback.
// localStorage is not encrypted, but it is acceptable for development/demo.
const webStore = {
  setItemAsync:    async (key, value) => { localStorage.setItem(key, value); },
  getItemAsync:    async (key)        => localStorage.getItem(key),
  deleteItemAsync: async (key)        => { localStorage.removeItem(key); },
};

const store = Platform.OS === 'web' ? webStore : SecureStore;

// In-memory cache: prevents repeated async reads on every API request
let _cachedToken = null;

export async function saveTokens(accessToken, refreshToken) {
  _cachedToken = accessToken;
  await Promise.all([
    store.setItemAsync(KEY.ACCESS_TOKEN,  accessToken),
    store.setItemAsync(KEY.REFRESH_TOKEN, refreshToken),
  ]);
}

export async function saveUser(user) {
  await store.setItemAsync(KEY.USER, JSON.stringify(user));
}

export async function getAccessToken() {
  if (_cachedToken) return _cachedToken;
  _cachedToken = await store.getItemAsync(KEY.ACCESS_TOKEN);
  return _cachedToken;
}

export async function getRefreshToken() {
  return store.getItemAsync(KEY.REFRESH_TOKEN);
}

export async function getStoredUser() {
  const raw = await store.getItemAsync(KEY.USER);
  return raw ? JSON.parse(raw) : null;
}

export async function clearAll() {
  _cachedToken = null;
  await Promise.all([
    store.deleteItemAsync(KEY.ACCESS_TOKEN),
    store.deleteItemAsync(KEY.REFRESH_TOKEN),
    store.deleteItemAsync(KEY.USER),
  ]);
}

// Called by the axios interceptor after a successful silent refresh,
// so the next request uses the new token without a store read.
export function updateCachedToken(token) {
  _cachedToken = token;
}
