import React, {
  createContext, useContext,
  useState, useEffect, useCallback,
} from 'react';
import {
  saveTokens, saveUser,
  getAccessToken, getStoredUser,
  clearAll,
} from '../utils/secureStorage';
import api, { setForceLogoutCallback } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,      setUser]      = useState(null);
  const [isLoading, setIsLoading] = useState(true); // true while restoring session

  // ── Cold-start session restore ───────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [token, storedUser] = await Promise.all([
          getAccessToken(),
          getStoredUser(),
        ]);
        // Both must be present for a valid session
        if (token && storedUser) setUser(storedUser);
      } catch {
        await clearAll();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // ── Logout ───────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      // Best-effort: invalidate the refresh token on the server
      await api.post('/auth/logout');
    } catch {
      // Proceed with local logout even if the server call fails
    } finally {
      await clearAll();
      setUser(null);
    }
  }, []);

  // Let the axios interceptor trigger logout when the refresh token expires
  useEffect(() => {
    setForceLogoutCallback(logout);
  }, [logout]);

  // ── Login ────────────────────────────────────────────────────────
  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    await Promise.all([
      saveTokens(data.accessToken, data.refreshToken),
      saveUser(data.user),
    ]);
    setUser(data.user);
  }

  // ── Register (returns, does not auto-login) ──────────────────────
  async function register(name, email, password) {
    const registerData = { name, email, password };
    console.log('Registering with:', { name, email, password: '***' });
    try {
      const { data } = await api.post('/auth/register', registerData);
      console.log('Register success:', data);
      return data;
    } catch (error) {
      console.error('Register failed — message :', error.message);
      console.error('Server response         :', error.response?.data);
      console.error('HTTP status             :', error.response?.status);
      throw error;
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
