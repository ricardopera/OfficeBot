import React, { useState, useCallback } from "react";
import { Button, Dropdown, Menu, Message } from "@arco-design/web-react";
import { useTranslation } from "../../hooks/useTranslation";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  status?: "idle" | "streaming" | "finished" | "error";
}

interface MessageBubbleProps {
  message: ChatMessage;
  onCopy?: (content: string) => void;
  onDelete?: (messageId: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
}

export function MessageBubble({ message, onCopy, onDelete, onEdit }: MessageBubbleProps) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content);
    Message.success(t("chat.copy"));
    onCopy?.(message.content);
  }, [message.content, onCopy, t]);

  const handleDelete = useCallback(() => {
    onDelete?.(message.id);
  }, [message.id, onDelete]);

  const handleEditStart = useCallback(() => {
    setIsEditing(true);
    setEditContent(message.content);
  }, [message.content]);

  const handleEditSave = useCallback(() => {
    onEdit?.(message.id, editContent);
    setIsEditing(false);
  }, [message.id, editContent, onEdit]);

  const handleEditCancel = useCallback(() => {
    setIsEditing(false);
    setEditContent(message.content);
  }, [message.content]);

  const isUser = message.role === "user";
  const showActions = isUser;

  const menu = (
    <Menu>
      <Menu.Item key="copy" onClick={handleCopy}>
        {t("chat.copy")}
      </Menu.Item>
      {isUser && (
        <Menu.Item key="edit" onClick={handleEditStart}>
          {t("chat.editMessage")}
        </Menu.Item>
      )}
      {showActions && (
        <Menu.Item key="delete" onClick={handleDelete}>
          {t("chat.delete")}
        </Menu.Item>
      )}
    </Menu>
  );

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[70%] rounded-lg px-4 py-2 ${
          isUser
            ? "bg-[var(--color-primary)] text-white"
            : "bg-[var(--color-bg-2)] text-[var(--color-text-1)]"
        }`}
      >
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="w-full p-2 border border-[var(--color-border)] rounded bg-[var(--color-bg-1)] text-[var(--color-text-1)]"
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <Button size="small" onClick={handleEditCancel}>
                {t("common.cancel")}
              </Button>
              <Button size="small" type="primary" onClick={handleEditSave}>
                {t("common.save")}
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="whitespace-pre-wrap break-words">{message.content}</div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs opacity-70">
                {new Date(message.timestamp).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              {!isEditing && (
                <Dropdown trigger="click" droplist={menu}>
                  <Button size="mini" className="opacity-0 hover:opacity-100">
                    ...
                  </Button>
                </Dropdown>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MessageBubble;