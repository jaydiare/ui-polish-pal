import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { translations, type Lang, type TranslationKey } from "./translations";

const STORAGE_KEY = "vzla-lang";

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const detectLang = (): Lang => {
  if (typeof window === "undefined") return "en";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "es") return stored;
  } catch {
    /* localStorage unavailable */
  }
  const nav = window.navigator?.language || "";
  return nav.toLowerCase().startsWith("es") ? "es" : "en";
};

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(detectLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey) => translations[lang][key] ?? translations.en[key] ?? key,
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
};
