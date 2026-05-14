import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../stores/settingsStore';

export function AppearanceSettings() {
  const { t } = useTranslation();
  const { settings, saveSettings } = useSettingsStore();

  return (
    <div className="space-y-4">
      <h3 className="font-medium">{t('settings.appearance')}</h3>

      {/* Theme */}
      <div>
        <label className="text-sm font-medium block mb-2">{t('settings.theme')}</label>
        <div className="flex gap-2">
          {(['light', 'dark', 'system'] as const).map((theme) => (
            <button
              key={theme}
              onClick={() => saveSettings({ theme })}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                settings.theme === theme
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {t(`settings.${theme}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Font size */}
      <div>
        <label className="text-sm font-medium block mb-2">
          {t('settings.fontSize')}: {settings.fontSize}px
        </label>
        <input
          type="range"
          min={12}
          max={24}
          value={settings.fontSize}
          onChange={(e) => saveSettings({ fontSize: Number(e.target.value) })}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>12px</span>
          <span>24px</span>
        </div>
      </div>

      {/* Density */}
      <div>
        <label className="text-sm font-medium block mb-2">{t('settings.density')}</label>
        <div className="flex gap-2">
          {(['compact', 'normal', 'comfortable'] as const).map((density) => (
            <button
              key={density}
              onClick={() => saveSettings({ density })}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                settings.density === density
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {t(`settings.${density}`)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
