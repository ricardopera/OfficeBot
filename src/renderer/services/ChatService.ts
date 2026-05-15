export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  metadata?: {
    model?: string;
    tokens?: number;
    toolCalls?: any[];
    thought?: string;
  };
}

export interface Conversation {
  id: string;
  title: string;
  agentId: string;
  agentType: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface SendMessageOptions {
  conversationId?: string;
  agentType: string;
  message: string;
  stream?: boolean;
}

class ChatService {
  async sendMessage(options: SendMessageOptions): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await window.electron.ipcRenderer.invoke("chat:send", options);
      return response;
    } catch (error) {
      return { success: false, error: "Failed to send message" };
    }
  }

  async getConversation(conversationId: string): Promise<{ success: boolean; data?: Conversation; error?: string }> {
    try {
      const response = await window.electron.ipcRenderer.invoke("conversation:get", conversationId);
      return response;
    } catch (error) {
      return { success: false, error: "Failed to get conversation" };
    }
  }

  async getConversations(): Promise<{ success: boolean; data?: Conversation[]; error?: string }> {
    try {
      const response = await window.electron.ipcRenderer.invoke("conversation:getAll");
      return response;
    } catch (error) {
      return { success: false, error: "Failed to get conversations" };
    }
  }

  async createConversation(agentId: string, agentType: string): Promise<{ success: boolean; data?: Conversation; error?: string }> {
    try {
      const response = await window.electron.ipcRenderer.invoke("conversation:create", { agentId, agentType });
      return response;
    } catch (error) {
      return { success: false, error: "Failed to create conversation" };
    }
  }

  async deleteConversation(conversationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await window.electron.ipcRenderer.invoke("conversation:delete", conversationId);
      return response;
    } catch (error) {
      return { success: false, error: "Failed to delete conversation" };
    }
  }

  async stopStreaming(): Promise<void> {
    await window.electron.ipcRenderer.invoke("chat:stop");
  }

  async regenerateMessage(conversationId: string): Promise<{ success: boolean; data?: ChatMessage; error?: string }> {
    try {
      const response = await window.electron.ipcRenderer.invoke("chat:regenerate", { conversationId });
      return response;
    } catch (error) {
      return { success: false, error: "Failed to regenerate message" };
    }
  }
}

export const chatService = new ChatService();
export default chatService;