/**
 * Mock authentication context.
 * FUTURE: store a real JWT, refresh it, and validate the session against
 * `POST /api/auth/login` + `GET /api/auth/me`.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CURRENT_USER } from "../data/mockData";
import * as api from "../services/fraudApi";

const AuthContext = createContext(null);
const STORAGE_KEY = "fraudshield.session";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      /* ignore corrupted storage */
    }
    setBooting(false);
  }, []);

  const persist = useCallback((nextUser) => {
    setUser(nextUser);
    if (nextUser) localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  const login = useCallback(
    async (credentials) => {
      const res = await api.login(credentials);
      const nextUser = { ...CURRENT_USER, email: res.user.email };
      persist(nextUser);
      return nextUser;
    },
    [persist]
  );

  const signup = useCallback(
    async (payload) => {
      const res = await api.signup(payload);
      const nextUser = { ...CURRENT_USER, name: res.user.name, email: res.user.email };
      persist(nextUser);
      return nextUser;
    },
    [persist]
  );

  const logout = useCallback(() => persist(null), [persist]);

  const updateProfile = useCallback(
    (patch) => persist({ ...(user ?? CURRENT_USER), ...patch }),
    [persist, user]
  );

  const value = useMemo(
    () => ({ user, booting, isAuthenticated: Boolean(user), login, signup, logout, updateProfile }),
    [user, booting, login, signup, logout, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
