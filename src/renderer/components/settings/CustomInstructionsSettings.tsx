import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../stores/settingsStore';

export function CustomInstructionsSettings() {
  const { t } = useTranslation();
  const { settings, saveSettings } = useSettingsStore();
  const [instructions, setInstructions] = useState(settings.customInstructions ?? '');
  const [tavilyKey, setTavilyKey] = useState(settings.tavilyApiKey ?? '');
  const [braveKey, setBraveKey] = useState(settings.braveApiKey ?? '');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setInstructions(settings.customInstructions ?? '');
    setTavilyKey(settings.tavilyApiKey ?? '');
    setBraveKey(settings.braveApiKey ?? '');
  }, [settings.customInstructions, settings.tavilyApiKey, settings.braveApiKey]);

  const handleSave = async () => {
    await saveSettings({
      customInstructions: instructions || undefined,
      tavilyApiKey: tavilyKey || undefined,
      braveApiKey: braveKey || undefined,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Custom Instructions */}
      <div>
        <h3 className="font-medium mb-2">{t('settings.customInstructions')}</h3>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={6}
          className="input-field text-sm resize-none w-full"
          placeholder={t('settings.customInstructionsPlaceholder')}
        />
      </div>

      {/* Web Search API keys */}
      <div>
        <h3 className="font-medium mb-1">{t('settings.webSearchApiKey')}</h3>
        <p className="text-xs text-gray-500 mb-3">{t('settings.webSearchDesc')}</p>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium block mb-1">{t('settings.tavilyApiKey')}</label>
            <input
              type="password"
              value={tavilyKey}
              onChange={(e) => setTavilyKey(e.target.value)}
              className="input-field text-sm"
              placeholder="tvly-..."
              autoComplete="off"
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">{t('settings.braveApiKey')}</label>
            <input
              type="password"
              value={braveKey}
              onChange={(e) => setBraveKey(e.target.value)}
              className="input-field text-sm"
              placeholder="BSA..."
              autoComplete="off"
            />
          </div>
        </div>
      </div>

      <button onClick={handleSave} className="btn-primary text-sm">
        {saved ? t('settings.saved') : t('settings.saveSettings')}
      </button>
    </div>
  );
}
