import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../stores/settingsStore';
import type { ApprovalMode } from '@shared/types';
import { TOOL_NAMES } from '@shared/constants';

const APPROVAL_MODES: { id: ApprovalMode; labelKey: string; descKey: string }[] = [
  { id: 'safe', labelKey: 'settings.safe', descKey: 'settings.safeDesc' },
  { id: 'semi-auto', labelKey: 'settings.semiAuto', descKey: 'settings.semiAutoDesc' },
  { id: 'yolo', labelKey: 'settings.yolo', descKey: 'settings.yoloDesc' },
  { id: 'custom', labelKey: 'settings.custom', descKey: 'settings.customDesc' },
];

export function ApprovalSettings() {
  const { t } = useTranslation();
  const { settings, saveSettings } = useSettingsStore();

  const handleModeChange = (mode: ApprovalMode) => {
    saveSettings({ approvalMode: mode });
  };

  const toggleToolApproval = (toolName: string) => {
    const current = settings.approvalPolicies ?? [];
    const existing = current.find((p) => p.toolName === toolName);
    const updated = existing
      ? current.map((p) => (p.toolName === toolName ? { ...p, autoApprove: !p.autoApprove } : p))
      : [...current, { toolName, autoApprove: true }];
    saveSettings({ approvalPolicies: updated });
  };

  const getAutoApprove = (toolName: string): boolean => {
    return settings.approvalPolicies?.find((p) => p.toolName === toolName)?.autoApprove ?? false;
  };

  return (
    <div className="space-y-6">
      {/* Mode selection */}
      <div>
        <h3 className="font-medium mb-3">{t('settings.approvalMode')}</h3>
        <div className="space-y-2">
          {APPROVAL_MODES.map((mode) => (
            <label
              key={mode.id}
              className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${
                settings.approvalMode === mode.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
              }`}
            >
              <input
                type="radio"
                name="approvalMode"
                value={mode.id}
                checked={settings.approvalMode === mode.id}
                onChange={() => handleModeChange(mode.id)}
                className="mt-0.5"
              />
              <div>
                <div className="font-medium text-sm">{t(mode.labelKey)}</div>
                <div className="text-xs text-gray-500">{t(mode.descKey)}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Custom policies */}
      {settings.approvalMode === 'custom' && (
        <div>
          <h4 className="font-medium text-sm mb-3">Políticas por ferramenta</h4>
          <div className="space-y-1">
            {Object.values(TOOL_NAMES).map((toolName) => (
              <label key={toolName} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm font-mono">{toolName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{t('settings.autoApprove')}</span>
                  <input
                    type="checkbox"
                    checked={getAutoApprove(toolName)}
                    onChange={() => toggleToolApproval(toolName)}
                  />
                </div>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
