import { useCallback } from "react";
import i18n, { Locale, setLocale, getLocale, t as translate } from "../../common/i18n";
import { useTranslation as useI18nHook } from "./useTranslation";

export interface UseI18nReturn {
  t: (key: string, params?: Record<string, string | number>) => string;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  availableLocales: Locale[];
  formatDate: (date: Date | number, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (number: number, options?: Intl.NumberFormatOptions) => string;
}

export function useI18n(): UseI18nReturn {
  const { t, locale, setLocale: setHookLocale } = useI18nHook();

  const setLocaleHandler = useCallback((newLocale: Locale) => {
    setLocale(newLocale);
    setHookLocale(newLocale);
  }, [setHookLocale]);

  const formatDate = useCallback(
    (date: Date | number, options?: Intl.DateTimeFormatOptions) => {
      const dateObj = typeof date === "number" ? new Date(date) : date;
      return dateObj.toLocaleDateString(locale === "en-US" ? "en-US" : locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
        ...options,
      });
    },
    [locale]
  );

  const formatNumber = useCallback(
    (number: number, options?: Intl.NumberFormatOptions) => {
      return number.toLocaleString(locale === "en-US" ? "en-US" : locale, options);
    },
    [locale]
  );

  return {
    t,
    locale,
    setLocale: setLocaleHandler,
    availableLocales: ["pt-BR", "en-US", "zh-CN"],
    formatDate,
    formatNumber,
  };
}

export default useI18n;