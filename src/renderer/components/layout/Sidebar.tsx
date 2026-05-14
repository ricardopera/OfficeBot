import React from 'react';
import { useTranslation } from 'react-i18next';
import { useUiStore } from '../../stores/uiStore';
import { FileTree } from '../files/FileTree';
import { ConversationList } from '../conversations/ConversationList';
import { FolderOpen, MessageSquare, Search } from 'lucide-react';

export function Sidebar() {
  const { t } = useTranslation();
  const { sidebarTab, setSidebarTab } = useUiStore();

  const tabs = [
    { id: 'files' as const, icon: FolderOpen, label: t('files.explorer') },
    { id: 'conversations' as const, icon: MessageSquare, label: t('files.conversations') },
    { id: 'search' as const, icon: Search, label: t('files.search') },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSidebarTab(tab.id)}
            title={tab.label}
            className={`flex-1 flex items-center justify-center py-3 transition-colors ${
              sidebarTab === tab.id
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <tab.icon size={18} />
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {sidebarTab === 'files' && <FileTree />}
        {sidebarTab === 'conversations' && <ConversationList />}
        {sidebarTab === 'search' && <SearchPanel />}
      </div>
    </div>
  );
}

function SearchPanel() {
  const { t } = useTranslation();
  return (
    <div className="p-3">
      <input
        type="text"
        placeholder={t('common.search')}
        className="input-field"
      />
      <p className="text-xs text-gray-500 mt-2 text-center">Busca em conversas em breve</p>
    </div>
  );
}
