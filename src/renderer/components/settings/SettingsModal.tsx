import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUiStore } from '../../stores/uiStore';
import { X } from 'lucide-react';
import { ProviderSettings } from './ProviderSettings';
import { ApprovalSettings } from './ApprovalSettings';
import { AppearanceSettings } from './AppearanceSettings';
import { LanguageSettings } from './LanguageSettings';
import { DataSettings } from './DataSettings';

type Tab = 'provider' | 'approval' | 'appearance' | 'language' | 'data';

export function SettingsModal() {
  const { t } = useTranslation();
  const { setShowSettings } = useUiStore();
  const [activeTab, setActiveTab] = useState<Tab>('provider');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'provider', label: t('settings.provider') },
    { id: 'approval', label: t('settings.approval') },
    { id: 'appearance', label: t('settings.appearance') },
    { id: 'language', label: t('settings.language') },
    { id: 'data', label: t('settings.data') },
  ];

  return (
    <div className="modal-overlay" onClick={() => setShowSettings(false)}>
      <div
        className="modal-content w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">{t('settings.title')}</h2>
          <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar tabs */}
          <div className="w-40 border-r border-gray-200 dark:border-gray-700 py-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'provider' && <ProviderSettings />}
            {activeTab === 'approval' && <ApprovalSettings />}
            {activeTab === 'appearance' && <AppearanceSettings />}
            {activeTab === 'language' && <LanguageSettings />}
            {activeTab === 'data' && <DataSettings />}
          </div>
        </div>
      </div>
    </div>
  );
}
