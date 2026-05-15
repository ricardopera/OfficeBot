import { useState, useCallback, useEffect, useRef } from "react";
import { Message } from "@arco-design/web-react";
import { useTranslation } from "./useTranslation";

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
  agentId: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

interface UseChatOptions {
  conversationId?: string;
  agentType?: string;
  onMessageReceived?: (message: ChatMessage) => void;
}

export function useChat({ conversationId, agentType = "acp", onMessageReceived }: UseChatOptions = {}) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    }
  }, [conversationId]);

  const loadConversation = async (convId: string) => {
    setIsLoading(true);
    try {
      const response = await window.electron.ipcRenderer.invoke("conversation:get", convId);
      if (response.success && response.data) {
        setConversation(response.data);
        setMessages(response.data.messages || []);
      }
    } catch (error) {
      Message.error(t("errors.generic"));
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      abortControllerRef.current = new AbortController();

      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "user",
        content,
        timestamp: Date.now(),
        status: "idle",
      };

      setMessages(prev => [...prev, userMessage]);
      setIsStreaming(true);

      try {
        const response = await window.electron.ipcRenderer.invoke("chat:send", {
          conversationId,
          agentType,
          message: content,
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
          onMessageReceived?.(assistantMessage);
        } else {
          const errorMessage: ChatMessage = {
            id: `msg-${Date.now() + 1}`,
            role: "assistant",
            content: response.error || t("errors.generic"),
            timestamp: Date.now(),
            status: "error",
          };
          setMessages(prev => [...prev, errorMessage]);
        }
      } catch (error) {
        const errorMessage: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          role: "assistant",
          content: t("errors.generic"),
          timestamp: Date.now(),
          status: "error",
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsStreaming(false);
      }
    },
    [conversationId, agentType, isStreaming, t, onMessageReceived]
  );

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const regenerateMessage = useCallback(async () => {
    const lastUserMessage = [...messages].reverse().find(m => m.role === "user");
    if (lastUserMessage) {
      await sendMessage(lastUserMessage.content);
    }
  }, [messages, sendMessage]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const deleteMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(m => m.id !== messageId));
  }, []);

  const editMessage = useCallback((messageId: string, newContent: string) => {
    setMessages(prev =>
      prev.map(m => (m.id === messageId ? { ...m, content: newContent } : m))
    );
  }, []);

  return {
    messages,
    conversation,
    isStreaming,
    isLoading,
    sendMessage,
    stopStreaming,
    regenerateMessage,
    clearMessages,
    deleteMessage,
    editMessage,
    loadConversation,
  };
}

export default useChat;