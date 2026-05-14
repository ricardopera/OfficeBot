import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../stores/settingsStore';
import i18n from '../../i18n';
import type { Language } from '@shared/types';

const LANGUAGES: { id: Language; name: string; flag: string }[] = [
  { id: 'pt-BR', name: 'Português (Brasil)', flag: '🇧🇷' },
  { id: 'en', name: 'English', flag: '🇺🇸' },
];

export function LanguageSettings() {
  const { t } = useTranslation();
  const { settings, saveSettings } = useSettingsStore();

  const handleChange = async (lang: Language) => {
    await saveSettings({ language: lang });
    await i18n.changeLanguage(lang);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium">{t('settings.language')}</h3>
      <p className="text-sm text-gray-500">{t('settings.currentLanguage')}: {settings.language}</p>

      <div className="space-y-2">
        {LANGUAGES.map((lang) => (
          <label
            key={lang.id}
            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${
              settings.language === lang.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
            }`}
          >
            <input
              type="radio"
              name="language"
              value={lang.id}
              checked={settings.language === lang.id}
              onChange={() => handleChange(lang.id)}
            />
            <span className="text-xl">{lang.flag}</span>
            <span className="font-medium">{lang.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
