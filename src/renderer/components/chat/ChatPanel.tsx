import React, { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useChatStore } from '../../stores/chatStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { Plus } from 'lucide-react';
import type { SendMessageRequest } from '@shared/types';

export function ChatPanel() {
  const { t } = useTranslation();
  const {
    activeConversationId,
    messages,
    isLoading,
    setLoading,
    loadMessages,
    createNewConversation,
  } = useChatStore();

  const { settings, providers } = useSettingsStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId);
    }
  }, [activeConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeConversationId]);

  const handleSend = async (text: string) => {
    let convId = activeConversationId;
    if (!convId) {
      convId = await createNewConversation();
    }

    const activeProvider = providers.find((p) => p.id === settings.activeProviderId);
    if (!activeProvider) {
      alert(t('settings.noProviders'));
      return;
    }

    setLoading(true);

    const req: SendMessageRequest = {
      conversationId: convId,
      message: text,
      providerId: activeProvider.id,
      modelId: activeProvider.defaultModel,
    };

    try {
      await window.electronAPI.sendMessage(req);
    } catch (err) {
      console.error('Error sending message:', err);
      setLoading(false);
    }
  };

  const handleStop = () => {
    if (activeConversationId) {
      window.electronAPI.stopAgent(activeConversationId);
    }
  };

  const currentMessages = activeConversationId
    ? (messages[activeConversationId] ?? [])
    : [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {t('common.appName')}
        </h2>
        <button
          onClick={createNewConversation}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          title={t('chat.newConversation')}
        >
          <Plus size={16} />
          {t('chat.newConversation')}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {currentMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-lg font-semibold mb-2">{t('onboarding.welcome')}</h3>
            <p className="text-sm text-gray-500 max-w-sm">
              {providers.length === 0
                ? t('onboarding.welcomeDesc')
                : t('onboarding.ready')}
            </p>
          </div>
        ) : (
          currentMessages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        onStop={handleStop}
        isLoading={isLoading}
      />
    </div>
  );
}
