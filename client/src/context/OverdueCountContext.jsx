import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { getOverdue } from "../api/transactions.api";

const OverdueCountContext = createContext({ count: 0, refresh: () => {}, loading: false });

const POLL_MS = 60_000;

export function OverdueCountProvider({ children }) {
  const { isAuthenticated, role } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) { setCount(0); return; }
    setLoading(true);
    try {
      const r = await getOverdue();
      setCount(r?.total ?? (Array.isArray(r) ? r.length : 0));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || role === "member") { setCount(0); return; }
    refresh();
    const t = setInterval(refresh, POLL_MS);
    return () => clearInterval(t);
  }, [isAuthenticated, role, refresh]);

  return (
    <OverdueCountContext.Provider value={{ count, refresh, loading }}>
      {children}
    </OverdueCountContext.Provider>
  );
}

export const useOverdueCount = () => useContext(OverdueCountContext);
