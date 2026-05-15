import { IpcPayload, createCodexRemap } from '../contracts/ipcBridge';

export interface SendMessageInput {
  conversationId: string;
  content: string;
  type?: string;
}

export interface RegenerateInput {
  conversationId: string;
  messageId: string;
}

export interface ChatContext {
  model?: string;
  systemPrompt?: string;
}

export async function handleChatSend(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as SendMessageInput;
  const channel = createCodexRemap(payload.channel);
  return { success: true, messageId: `msg_${Date.now()}`, channel };
}

export async function handleChatRegenerate(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as RegenerateInput;
  return { success: true, messageId: `msg_regen_${Date.now()}` };
}

export async function handleChatContinue(payload: IpcPayload): Promise<unknown> {
  return { success: true, messageId: `msg_cont_${Date.now()}` };
}

export async function handleChatAbort(payload: IpcPayload): Promise<unknown> {
  return { success: true, aborted: true };
}

export async function handleChatContextUpdate(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as ChatContext;
  return { success: true, context: data };
}

export async function handleChatHistory(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { conversationId: string; limit?: number };
  return { messages: [], hasMore: false };
}

export async function handleChatSearch(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { query: string; conversationId?: string };
  return { results: [], total: 0 };
}

export async function handleChatReaction(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { messageId: string; reaction: string };
  return { success: true };
}

export async function handleChatEditMessage(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { messageId: string; content: string };
  return { success: true, messageId: data.messageId };
}

export async function handleChatDeleteMessage(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { messageId: string };
  return { success: true };
}

export async function handleChatExport(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { conversationId: string; format: string };
  return { success: true, exportId: `export_${Date.now()}` };
}

export async function handleChatImport(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { file: string };
  return { success: true, importId: `import_${Date.now()}` };
}

export const chatHandlers = {
  'chat:send': handleChatSend,
  'chat:regenerate': handleChatRegenerate,
  'chat:continue': handleChatContinue,
  'chat:abort': handleChatAbort,
  'chat:context:update': handleChatContextUpdate,
  'chat:history': handleChatHistory,
  'chat:search': handleChatSearch,
  'chat:reaction': handleChatReaction,
  'chat:edit': handleChatEditMessage,
  'chat:delete': handleChatDeleteMessage,
  'chat:export': handleChatExport,
  'chat:import': handleChatImport,
};