import React from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Upload, Trash2 } from 'lucide-react';

export function DataSettings() {
  const { t } = useTranslation();

  const handleExport = async () => {
    const conversations = await window.electronAPI.listConversations();
    const json = JSON.stringify(conversations, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `officebot-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    const data = await window.electronAPI.importConversations();
    if (!data || !Array.isArray(data)) return;

    const now = Date.now();
    await Promise.all(
      (data as { id?: string; title?: string }[]).map((conv) =>
        window.electronAPI.createConversation({
          id: conv.id ?? `imported_${now}_${Math.random().toString(36).slice(2)}`,
          title: conv.title ?? t('chat.newConversation'),
          createdAt: now,
          updatedAt: now,
          isFavorite: false,
          isArchived: false,
        })
      )
    );
    window.location.reload();
  };

  const handleClearHistory = async () => {
    if (confirm(t('settings.clearHistoryConfirm'))) {
      const conversations = await window.electronAPI.listConversations();
      await Promise.all(conversations.map((c: { id: string }) => window.electronAPI.deleteConversation(c.id)));
      window.location.reload();
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium">{t('settings.data')}</h3>

      <div className="space-y-3">
        <button
          onClick={handleExport}
          className="btn-secondary w-full flex items-center justify-center gap-2"
        >
          <Download size={16} />
          {t('settings.exportConversations')}
        </button>

        <button
          onClick={handleImport}
          className="btn-secondary w-full flex items-center justify-center gap-2"
        >
          <Upload size={16} />
          {t('settings.importConversations')}
        </button>

        <hr className="border-gray-200 dark:border-gray-700" />

        <button
          onClick={handleClearHistory}
          className="btn-danger w-full flex items-center justify-center gap-2"
        >
          <Trash2 size={16} />
          {t('settings.clearHistory')}
        </button>
      </div>
    </div>
  );
}
