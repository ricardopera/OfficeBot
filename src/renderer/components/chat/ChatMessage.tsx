import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from 'react-i18next';
import type { Message } from '@shared/types';
import { ToolCallCard } from './ToolCallCard';
import { CodeBlock } from './CodeBlock';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const { t } = useTranslation();
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] ${isUser ? 'order-2' : ''}`}>
        {/* Role label */}
        <div className={`text-xs mb-1 ${isUser ? 'text-right text-gray-500' : 'text-gray-500'}`}>
          {isUser ? t('chat.you') : t('chat.assistant')}
        </div>

        {/* Message bubble */}
        <div
          className={
            isUser
              ? 'chat-message-user'
              : 'chat-message-assistant'
          }
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <div className={`markdown-body text-sm ${message.isStreaming ? 'typing-cursor' : ''}`}>
              {message.content ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code(props) {
                      const { children, className } = props;
                      const match = /language-(\w+)/.exec(className || '');
                      const inline = !match;
                      if (inline) {
                        return <code className={className}>{children}</code>;
                      }
                      return (
                        <CodeBlock
                          code={String(children).replace(/\n$/, '')}
                          language={match[1]}
                        />
                      );
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              ) : message.isStreaming ? (
                <span className="text-gray-400">{t('chat.thinking')}</span>
              ) : null}
            </div>
          )}
        </div>

        {/* Tool calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.toolCalls.map((tc) => (
              <ToolCallCard key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
