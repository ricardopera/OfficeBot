import React from "react";
import { Spin } from "@arco-design/web-react";
import { MessageBubble, ChatMessage } from "./MessageBubble";
import { useTranslation } from "../../hooks/useTranslation";

interface ChatWindowProps {
  messages: ChatMessage[];
  agentType?: string;
  onCopyMessage?: (content: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  streaming?: boolean;
}

export function ChatWindow({
  messages,
  agentType = "acp",
  onCopyMessage,
  onDeleteMessage,
  onEditMessage,
  streaming = false,
}: ChatWindowProps) {
  const { t } = useTranslation();

  const groupedMessages = React.useMemo(() => {
    const groups: { date: string; messages: ChatMessage[] }[] = [];
    let currentDate = "";
    let currentGroup: ChatMessage[] = [];

    messages.forEach(msg => {
      const msgDate = new Date(msg.timestamp).toLocaleDateString("pt-BR");
      if (msgDate !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({ date: currentDate, messages: currentGroup });
        }
        currentDate = msgDate;
        currentGroup = [msg];
      } else {
        currentGroup.push(msg);
      }
    });

    if (currentGroup.length > 0) {
      groups.push({ date: currentDate, messages: currentGroup });
    }

    return groups;
  }, [messages]);

  const formatDateHeader = (dateStr: string) => {
    const today = new Date().toLocaleDateString("pt-BR");
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString("pt-BR");

    if (dateStr === today) return t("chat.today");
    if (dateStr === yesterday) return t("chat.yesterday");
    return dateStr;
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      {groupedMessages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-[var(--color-text-3)]">
            <p>{t("chat.newChat")}</p>
            <p className="text-sm mt-2">{t("chat.typePlaceholder")}</p>
          </div>
        </div>
      ) : (
        groupedMessages.map((group, groupIndex) => (
          <div key={groupIndex}>
            <div className="text-center py-2">
              <span className="text-xs text-[var(--color-text-3)] bg-[var(--color-bg-2)] px-3 py-1 rounded">
                {formatDateHeader(group.date)}
              </span>
            </div>
            <div className="space-y-4">
              {group.messages.map(message => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onCopy={onCopyMessage}
                  onDelete={onDeleteMessage}
                  onEdit={onEditMessage}
                />
              ))}
            </div>
          </div>
        ))
      )}

      {streaming && (
        <div className="flex items-center gap-2 text-[var(--color-text-3)] mt-4">
          <Spin size={16} />
          <span className="text-sm">{t("chat.sendMessage")}...</span>
        </div>
      )}
    </div>
  );
}

export default ChatWindow;