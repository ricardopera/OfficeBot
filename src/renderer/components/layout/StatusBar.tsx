import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChatStore } from '../../stores/chatStore';
import { useFileStore } from '../../stores/fileStore';
import { useUiStore } from '../../stores/uiStore';
import { Settings, FolderOpen } from 'lucide-react';

export function StatusBar() {
  const { t } = useTranslation();
  const { settings, providers } = useSettingsStore();
  const { isLoading } = useChatStore();
  const { workspacePath } = useFileStore();
  const { toggleSettings } = useUiStore();

  const activeProvider = providers.find((p) => p.id === settings.activeProviderId);
  const modelName = activeProvider?.defaultModel ?? t('status.noModel');
  const workspaceName = workspacePath
    ? workspacePath.split('/').pop() ?? workspacePath
    : t('status.workspace');

  return (
    <div className="flex items-center justify-between px-3 py-1 bg-blue-600 dark:bg-blue-800 text-white text-xs select-none">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <FolderOpen size={12} />
          {workspaceName}
        </span>
        <span className="opacity-50">|</span>
        <span>{modelName}</span>
      </div>

      <div className="flex items-center gap-3">
        {isLoading && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            {t('status.thinking')}
          </span>
        )}
        <button
          onClick={toggleSettings}
          className="hover:opacity-80 transition-opacity"
          title={t('settings.title')}
        >
          <Settings size={14} />
        </button>
      </div>
    </div>
  );
}
