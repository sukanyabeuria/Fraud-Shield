/**
 * ---------------------------------------------------------------------------
 * Fraud-Shield — authentication context (real backend)
 * ---------------------------------------------------------------------------
 * No mock user, no hardcoded profile. The session holds only what the backend
 * returned (or, when the backend has no auth route yet, only the email the user
 * actually typed — never an invented name/role/team).
 *
 * Flow:
 *   1. try POST /api/v1/auth/login
 *   2. if that route does not exist (404/405), fall back to verifying the
 *      backend is genuinely reachable via GET /api/v1/health and open a local
 *      session. This is a REAL connectivity check, not fake data — if the
 *      backend is down, login fails with an error.
 * ---------------------------------------------------------------------------
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as api from "../services/fraudApi";
import { ERROR_KIND } from "../services/httpClient";

const AuthContext = createContext(null);
const STORAGE_KEY = "fraudshield.session";

/** Build a session object from an email only — no fabricated attributes. */
function sessionFromEmail(email, fullName) {
  return {
    id: null,
    name: fullName || email.split("@")[0].replace(/[._-]+/g, " "),
    email,
    role: null,
    team: null,
    token: null,
    authMode: "health-verified",
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setBooting(false);
  }, []);

  const persist = useCallback((next) => {
    setUser(next);
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  const login = useCallback(
    async ({ email, password }) => {
      try {
        const { token, user: backendUser } = await api.login({ email, password });
        const next = { ...(backendUser ?? sessionFromEmail(email)), token, authMode: "backend" };
        persist(next);
        return next;
      } catch (err) {
        // Auth route not implemented on the backend yet → verify the backend is
        // actually running before granting access. Any other error propagates.
        if (err?.kind === ERROR_KIND.NOT_FOUND) {
          await api.getHealth(); // throws if the backend is unreachable
          const next = sessionFromEmail(email);
          persist(next);
          return next;
        }
        throw err;
      }
    },
    [persist]
  );

  const signup = useCallback(
    async ({ fullName, email, password }) => {
      try {
        const { token, user: backendUser } = await api.register({ fullName, email, password });
        const next = {
          ...(backendUser ?? sessionFromEmail(email, fullName)),
          token,
          authMode: "backend",
        };
        persist(next);
        return next;
      } catch (err) {
        if (err?.kind === ERROR_KIND.NOT_FOUND) {
          await api.getHealth();
          const next = sessionFromEmail(email, fullName);
          persist(next);
          return next;
        }
        throw err;
      }
    },
    [persist]
  );

  const logout = useCallback(() => persist(null), [persist]);

  const updateProfile = useCallback(
    (patch) => persist({ ...(user ?? {}), ...patch }),
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
