import { IpcPayload, createCodexRemap } from '../contracts/ipcBridge';

export interface CreateConversationInput {
  type: string;
  model?: string;
  title?: string;
  backend?: string;
}

export interface UpdateConversationInput {
  conversationId: string;
  title?: string;
  pinned?: boolean;
}

export interface DeleteConversationInput {
  conversationId: string;
}

export async function handleConversationCreate(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as CreateConversationInput;
  const channel = createCodexRemap(payload.channel);
  return {
    success: true,
    conversationId: `conv_${Date.now()}`,
    type: channel.type,
    backend: channel.extra?.backend,
    model: data.model,
    title: data.title,
    createdAt: new Date().toISOString(),
  };
}

export async function handleConversationUpdate(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as UpdateConversationInput;
  return { success: true, conversationId: data.conversationId };
}

export async function handleConversationDelete(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as DeleteConversationInput;
  return { success: true, deletedId: data.conversationId };
}

export async function handleConversationList(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { limit?: number; offset?: number };
  return { conversations: [], total: 0, hasMore: false };
}

export async function handleConversationGet(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { conversationId: string };
  return { conversationId: data.conversationId, messages: [] };
}

export async function handleConversationSearch(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { query: string; limit?: number };
  return { results: [], total: 0 };
}

export async function handleConversationPin(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { conversationId: string };
  return { success: true, pinned: true };
}

export async function handleConversationUnpin(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { conversationId: string };
  return { success: true, pinned: false };
}

export async function handleConversationArchive(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { conversationId: string };
  return { success: true, archived: true };
}

export async function handleConversationRestore(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { conversationId: string };
  return { success: true, archived: false };
}

export async function handleConversationShare(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { conversationId: string; with?: string };
  return { success: true, shareId: `share_${Date.now()}` };
}

export async function handleConversationDuplicate(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { conversationId: string };
  return { success: true, newConversationId: `conv_dup_${Date.now()}` };
}

export async function handleConversationMerge(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { sourceId: string; targetId: string };
  return { success: true, mergedId: data.targetId };
}

export async function handleConversationModelChange(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { conversationId: string; oldModel: string; newModel: string };
  const oldStr = JSON.stringify(data.oldModel);
  const newStr = JSON.stringify(data.newModel);
  if (oldStr !== newStr) {
    return { success: true, modelChanged: true, rebuildRequired: true };
  }
  return { success: true, modelChanged: false };
}

export const conversationHandlers = {
  'conversation:create': handleConversationCreate,
  'conversation:update': handleConversationUpdate,
  'conversation:delete': handleConversationDelete,
  'conversation:list': handleConversationList,
  'conversation:get': handleConversationGet,
  'conversation:search': handleConversationSearch,
  'conversation:pin': handleConversationPin,
  'conversation:unpin': handleConversationUnpin,
  'conversation:archive': handleConversationArchive,
  'conversation:restore': handleConversationRestore,
  'conversation:share': handleConversationShare,
  'conversation:duplicate': handleConversationDuplicate,
  'conversation:merge': handleConversationMerge,
  'conversation:model:change': handleConversationModelChange,
};