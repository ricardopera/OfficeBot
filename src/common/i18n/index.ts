export type Locale = "pt-BR" | "en-US" | "zh-CN";

export interface LocaleConfig {
  defaultLocale: Locale;
  fallbackLocale: Locale;
  supportedLocales: Locale[];
}

export interface TranslationMessages {
  [key: string]: string | TranslationMessages;
}

let currentLocale: Locale = "pt-BR";
let messages: Map<Locale, TranslationMessages> = new Map();
let config: LocaleConfig = {
  defaultLocale: "pt-BR",
  fallbackLocale: "en-US",
  supportedLocales: ["pt-BR", "en-US", "zh-CN"],
};

export function setLocale(locale: Locale): void {
  if (config.supportedLocales.includes(locale)) {
    currentLocale = locale;
  }
}

export function getLocale(): Locale {
  return currentLocale;
}

export function getConfig(): LocaleConfig {
  return { ...config };
}

export function setConfig(newConfig: Partial<LocaleConfig>): void {
  config = { ...config, ...newConfig };
}

function getNestedValue(obj: TranslationMessages, path: string): string | undefined {
  const keys = path.split(".");
  let current: TranslationMessages | string = obj;
  for (const key of keys) {
    if (typeof current === "string" || current === undefined) {
      return undefined;
    }
    current = current[key];
  }
  return typeof current === "string" ? current : undefined;
}

function interpolate(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;
  return text.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    return params[key.trim()]?.toString() ?? `{{${key}}}`;
  });
}

export function t(key: string, params?: Record<string, string | number>): string {
  const primaryMessages = messages.get(currentLocale);
  const fallbackMessages = messages.get(config.fallbackLocale);

  let translation: string | undefined;

  if (primaryMessages) {
    translation = getNestedValue(primaryMessages, key);
  }

  if (!translation && fallbackMessages) {
    translation = getNestedValue(fallbackMessages, key);
  }

  if (!translation) {
    return key;
  }

  return interpolate(translation, params);
}

export async function loadLocale(locale: Locale): Promise<void> {
  try {
    const module = await import(`./locales/${locale}.json`);
    messages.set(locale, module.default || module);
  } catch (error) {
    console.warn(`Failed to load locale ${locale}:`, error);
  }
}

export async function initI18n(initialLocale?: Locale): Promise<void> {
  const detectedLocale = initialLocale || detectLocale();

  if (detectedLocale && config.supportedLocales.includes(detectedLocale)) {
    currentLocale = detectedLocale;
  }

  const localesToLoad = [currentLocale, config.fallbackLocale].filter(
    (locale, index, self) => self.indexOf(locale) === index
  );

  await Promise.all(localesToLoad.map(loadLocale));
}

export function detectLocale(): Locale | undefined {
  if (typeof window !== "undefined" && window.navigator) {
    const browserLang = window.navigator.language;
    if (browserLang.startsWith("pt")) return "pt-BR";
    if (browserLang.startsWith("zh")) return "zh-CN";
    if (browserLang.startsWith("en")) return "en-US";
  }
  return undefined;
}

export default {
  t,
  setLocale,
  getLocale,
  getConfig,
  setConfig,
  loadLocale,
  initI18n,
  detectLocale,
};