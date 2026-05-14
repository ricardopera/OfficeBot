import { create } from 'zustand';
import type { Conversation, Message, AgentStreamEvent, ToolCallInfo } from '@shared/types';

interface ChatStore {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>;
  isLoading: boolean;
  streamingMessageId: string | null;

  setConversations: (convs: Conversation[]) => void;
  setActiveConversation: (id: string | null) => void;
  addMessage: (msg: Message) => void;
  updateMessage: (id: string, conversationId: string, updates: Partial<Message>) => void;
  appendMessageText: (id: string, conversationId: string, text: string) => void;
  setMessages: (conversationId: string, messages: Message[]) => void;
  setLoading: (loading: boolean) => void;
  setStreamingMessageId: (id: string | null) => void;
  handleStreamEvent: (event: AgentStreamEvent) => void;
  createNewConversation: () => Promise<string>;
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
}

function newId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  isLoading: false,
  streamingMessageId: null,

  setConversations: (convs) => set({ conversations: convs }),
  setActiveConversation: (id) => set({ activeConversationId: id }),

  addMessage: (msg) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [msg.conversationId]: [...(state.messages[msg.conversationId] ?? []), msg],
      },
    })),

  updateMessage: (id, conversationId, updates) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] ?? []).map((m) =>
          m.id === id ? { ...m, ...updates } : m
        ),
      },
    })),

  appendMessageText: (id, conversationId, text) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] ?? []).map((m) =>
          m.id === id ? { ...m, content: (m.content ?? '') + text } : m
        ),
      },
    })),

  setMessages: (conversationId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [conversationId]: messages },
    })),

  setLoading: (loading) => set({ isLoading: loading }),
  setStreamingMessageId: (id) => set({ streamingMessageId: id }),

  handleStreamEvent: (event: AgentStreamEvent) => {
    const { conversationId, messageId, type } = event;
    if (!messageId) return;

    switch (type) {
      case 'text_delta':
        // Add or append to streaming message
        set((state) => {
          const msgs = state.messages[conversationId] ?? [];
          const exists = msgs.find((m) => m.id === messageId);
          if (!exists) {
            return {
              streamingMessageId: messageId,
              messages: {
                ...state.messages,
                [conversationId]: [
                  ...msgs,
                  {
                    id: messageId,
                    conversationId,
                    role: 'assistant' as const,
                    content: event.text ?? '',
                    createdAt: Date.now(),
                    sequence: msgs.length,
                    isStreaming: true,
                  },
                ],
              },
            };
          }
          return {
            messages: {
              ...state.messages,
              [conversationId]: msgs.map((m) =>
                m.id === messageId
                  ? { ...m, content: (m.content ?? '') + (event.text ?? '') }
                  : m
              ),
            },
          };
        });
        break;

      case 'tool_start':
        if (event.toolCall) {
          set((state) => {
            const msgs = state.messages[conversationId] ?? [];
            const msg = msgs.find((m) => m.id === messageId);
            if (!msg) return state;
            const toolCalls = [...(msg.toolCalls ?? []), event.toolCall!];
            return {
              messages: {
                ...state.messages,
                [conversationId]: msgs.map((m) =>
                  m.id === messageId ? { ...m, toolCalls } : m
                ),
              },
            };
          });
        }
        break;

      case 'tool_result':
        if (event.toolCall) {
          set((state) => {
            const msgs = state.messages[conversationId] ?? [];
            const msg = msgs.find((m) => m.id === messageId);
            if (!msg) return state;
            const toolCalls = (msg.toolCalls ?? []).map((tc: ToolCallInfo) =>
              tc.id === event.toolCall!.id ? { ...tc, ...event.toolCall } : tc
            );
            return {
              messages: {
                ...state.messages,
                [conversationId]: msgs.map((m) =>
                  m.id === messageId ? { ...m, toolCalls } : m
                ),
              },
            };
          });
        }
        break;

      case 'finish':
        set((state) => ({
          streamingMessageId: null,
          isLoading: false,
          messages: {
            ...state.messages,
            [conversationId]: (state.messages[conversationId] ?? []).map((m) =>
              m.id === messageId ? { ...m, isStreaming: false } : m
            ),
          },
        }));
        break;

      case 'error':
        set((state) => ({
          streamingMessageId: null,
          isLoading: false,
          messages: {
            ...state.messages,
            [conversationId]: (state.messages[conversationId] ?? []).map((m) =>
              m.id === messageId
                ? { ...m, isStreaming: false, content: (m.content ?? '') + `\n\n⚠️ Erro: ${event.error}` }
                : m
            ),
          },
        }));
        break;
    }
  },

  createNewConversation: async () => {
    const id = newId('conv');
    const conv: Conversation = {
      id,
      title: 'Nova conversa',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: false,
      isArchived: false,
    };
    await window.electronAPI.createConversation(conv);
    set((state) => ({
      conversations: [conv, ...state.conversations],
      activeConversationId: id,
      messages: { ...state.messages, [id]: [] },
    }));
    return id;
  },

  loadConversations: async () => {
    const convs = await window.electronAPI.listConversations();
    set({ conversations: convs });
  },

  loadMessages: async (conversationId: string) => {
    const msgs = await window.electronAPI.getMessages(conversationId);
    set((state) => ({
      messages: { ...state.messages, [conversationId]: msgs },
    }));
  },

  deleteConversation: async (id: string) => {
    await window.electronAPI.deleteConversation(id);
    set((state) => {
      const convs = state.conversations.filter((c) => c.id !== id);
      const msgs = { ...state.messages };
      delete msgs[id];
      return {
        conversations: convs,
        activeConversationId: state.activeConversationId === id ? null : state.activeConversationId,
        messages: msgs,
      };
    });
  },
}));
