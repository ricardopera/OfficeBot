import React from 'react';
import { useTranslation } from 'react-i18next';
import { useChatStore } from '../../stores/chatStore';
import { useUiStore } from '../../stores/uiStore';
import { formatDistanceToNow } from '../../../renderer/utils/date';
import { MessageSquare, Star, Trash2, Plus } from 'lucide-react';

export function ConversationList() {
  const { t } = useTranslation();
  const { conversations, activeConversationId, setActiveConversation, deleteConversation, createNewConversation } =
    useChatStore();
  const { setSidebarTab } = useUiStore();

  const handleSelect = async (id: string) => {
    setActiveConversation(id);
    setSidebarTab('conversations');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {t('files.conversations')}
        </span>
        <button
          onClick={createNewConversation}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          title={t('chat.newConversation')}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <MessageSquare size={24} className="text-gray-300 mb-2" />
            <p className="text-xs text-gray-500">{t('chat.noConversations')}</p>
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => handleSelect(conv.id)}
              className={`sidebar-item group ${
                activeConversationId === conv.id ? 'sidebar-item-active' : ''
              }`}
            >
              <MessageSquare size={14} className="flex-shrink-0 text-gray-400" />
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate font-medium">{conv.title}</div>
                <div className="text-xs text-gray-400">
                  {formatDistanceToNow(conv.updatedAt)}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(conv.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500 transition-opacity"
                title={t('common.delete')}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
