import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { translations, DEFAULT_LANG, SUPPORTED_LANGS } from "./translations";

const I18nContext = createContext(null);
const STORAGE_KEY = "ogu.lang";

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); if (s && SUPPORTED_LANGS.includes(s)) return s; } catch {}
    return DEFAULT_LANG;
  });
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
    try { document.documentElement.setAttribute("lang", lang); } catch {}
  }, [lang]);
  const t = useCallback((key, vars) => {
    const dict = translations[lang] || translations[DEFAULT_LANG];
    let str = dict[key] ?? translations[DEFAULT_LANG][key] ?? key;
    if (vars) for (const k of Object.keys(vars)) str = str.replaceAll(`{${k}}`, vars[k]);
    return str;
  }, [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be inside <I18nProvider>");
  return ctx;
};
