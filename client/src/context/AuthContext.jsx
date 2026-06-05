import { createContext, useContext, useEffect, useState, useCallback } from "react";

const AuthContext = createContext(null);

export const STORAGE_KEY = "lms_auth";

export const readStoredAuth = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearStoredAuth = () => localStorage.removeItem(STORAGE_KEY);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => readStoredAuth());

  useEffect(() => {
    if (auth) localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    else clearStoredAuth();
  }, [auth]);

  const loginUser = useCallback((data) => {
    const { token, ...user } = data;
    setAuth({ token, user });
  }, []);

  const logoutUser = useCallback(() => {
    setAuth(null);
  }, []);

  const updateUser = useCallback((patch) => {
    setAuth((prev) => (prev ? { ...prev, user: { ...prev.user, ...patch } } : prev));
  }, []);

  const value = {
    user: auth?.user || null,
    token: auth?.token || null,
    role: auth?.user?.role || null,
    isAuthenticated: !!auth?.token,
    login: loginUser,
    logout: logoutUser,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
};
