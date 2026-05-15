import { useState, useEffect, useCallback, useMemo } from "react";
import i18n, { Locale, getLocale, setLocale, t as translate, initI18n } from "../../common/i18n";

export interface UseTranslationReturn {
  t: (key: string, params?: Record<string, string | number>) => string;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  isLoading: boolean;
}

export function useTranslation(initialLocale?: Locale): UseTranslationReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [currentLocale, setCurrentLocale] = useState<Locale>(initialLocale || getLocale());

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setIsLoading(true);
      try {
        await initI18n(initialLocale);
        if (mounted) {
          setCurrentLocale(getLocale());
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [initialLocale]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      return translate(key, params);
    },
    []
  );

  const handleSetLocale = useCallback((locale: Locale) => {
    setLocale(locale);
    setCurrentLocale(getLocale());
  }, []);

  return useMemo(
    () => ({
      t,
      locale: currentLocale,
      setLocale: handleSetLocale,
      isLoading,
    }),
    [t, currentLocale, handleSetLocale, isLoading]
  );
}

export default useTranslation;