import { createContext, useContext, useEffect, useState } from "react";
import { getSettings } from "../api/settings.api";

const SettingsContext = createContext({ settings: null, refresh: () => {}, loading: true });

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const s = await getSettings();
      setSettings(s);
    } catch (e) {
      // settings endpoint requires auth; if 401 just keep null
      setSettings(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <SettingsContext.Provider value={{ settings, refresh: load, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
