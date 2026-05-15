import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, Input, Button, Modal, Spin, Message } from "@arco-design/web-react";
import { useTranslation } from "../../hooks/useTranslation";
import { ChatWindow } from "../../components/chat/ChatWindow";
import { SendBox } from "../../components/chat/SendBox";
import { MessageBubble } from "../../components/chat/MessageBubble";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  status?: "idle" | "streaming" | "finished" | "error";
}

export interface Conversation {
  id: string;
  title: string;
  agent: {
    id: string;
    name: string;
    backend: string;
  };
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

interface ChatPageProps {
  conversationId?: string;
  agentType?: "acp" | "gemini" | "aionrs" | "openclaw" | "nanobot" | "remote";
}

export function ChatPage({ conversationId, agentType = "acp" }: ChatPageProps) {
  const { t } = useTranslation();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [toolCalls, setToolCalls] = useState<any[]>([]);
  const [thoughtContent, setThoughtContent] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    }
  }, [conversationId]);

  const loadConversation = async (convId: string) => {
    try {
      const response = await window.electron.ipcRenderer.invoke("conversation:get", convId);
      if (response.success && response.data) {
        setConversation(response.data);
        setMessages(response.data.messages || []);
      }
    } catch (error) {
      Message.error(t("errors.generic"));
    }
  };

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isStreaming) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: inputValue,
      timestamp: Date.now(),
      status: "idle",
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsStreaming(true);

    try {
      const response = await window.electron.ipcRenderer.invoke("chat:send", {
        conversationId: conversation?.id,
        agentType,
        message: inputValue,
      });

      if (response.success) {
        const assistantMessage: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          role: "assistant",
          content: response.data.content,
          timestamp: Date.now(),
          status: "finished",
        };
        setMessages(prev => [...prev, assistantMessage]);

        if (response.data.toolCalls) {
          setToolCalls(response.data.toolCalls);
        }
        if (response.data.thought) {
          setThoughtContent(response.data.thought);
        }
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: t("errors.generic"),
        timestamp: Date.now(),
        status: "error",
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsStreaming(false);
    }
  }, [inputValue, isStreaming, conversation?.id, agentType, t]);

  const handleRegenerate = useCallback(async () => {
    if (messages.length === 0 || isStreaming) return;
    const lastUserMessage = [...messages].reverse().find(m => m.role === "user");
    if (lastUserMessage) {
      setInputValue(lastUserMessage.content);
      handleSendMessage();
    }
  }, [messages, isStreaming, handleSendMessage]);

  const handleStop = useCallback(() => {
    window.electron.ipcRenderer.invoke("chat:stop");
    setIsStreaming(false);
  }, []);

  const handleCopyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
    Message.success(t("chat.copy"));
  }, [t]);

  const handleDeleteMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(m => m.id !== messageId));
  }, []);

  const handleEditMessage = useCallback((messageId: string, newContent: string) => {
    setMessages(prev =>
      prev.map(m => (m.id === messageId ? { ...m, content: newContent } : m))
    );
  }, []);

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-1)]">
      <div className="flex-1 overflow-hidden">
        <ChatWindow
          messages={messages}
          agentType={agentType}
          onCopyMessage={handleCopyMessage}
          onDeleteMessage={handleDeleteMessage}
          onEditMessage={handleEditMessage}
          streaming={isStreaming}
        />
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-[var(--color-border)]">
        <SendBox
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSendMessage}
          onStop={handleStop}
          onRegenerate={handleRegenerate}
          disabled={isStreaming}
          streaming={isStreaming}
        />
      </div>

      <Modal
        title={t("agent.agentSettings")}
        visible={showSettings}
        onCancel={() => setShowSettings(false)}
        onOk={() => setShowSettings(false)}
      >
        <p>{t("agent.backend")}: {agentType}</p>
      </Modal>

      <Modal
        title={t("common.confirm")}
        visible={showPermissionDialog}
        onCancel={() => setShowPermissionDialog(false)}
        onOk={() => setShowPermissionDialog(false)}
      >
        <p>{t("agent.autoApproval")}</p>
      </Modal>
    </div>
  );
}

export default ChatPage;