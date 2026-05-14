import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../shared/ipc-channels';
import type {
  SendMessageRequest,
  ApprovalResponse,
  AppSettings,
  Conversation,
  AgentStreamEvent,
  ApprovalRequest,
} from '../shared/types';

// Expose a typed API to the renderer process
const api = {
  // ─── Agent ─────────────────────────────────────────────────────────────
  sendMessage: (req: SendMessageRequest) => ipcRenderer.invoke(IPC.AGENT_SEND_MESSAGE, req),
  stopAgent: (conversationId: string) => ipcRenderer.invoke(IPC.AGENT_STOP, conversationId),

  onStreamEvent: (callback: (event: AgentStreamEvent) => void) => {
    const listener = (_: Electron.IpcRendererEvent, event: AgentStreamEvent) => callback(event);
    ipcRenderer.on(IPC.AGENT_STREAM_EVENT, listener);
    return () => ipcRenderer.removeListener(IPC.AGENT_STREAM_EVENT, listener);
  },

  // ─── Approval ──────────────────────────────────────────────────────────
  onApprovalRequest: (callback: (req: ApprovalRequest) => void) => {
    const listener = (_: Electron.IpcRendererEvent, req: ApprovalRequest) => callback(req);
    ipcRenderer.on(IPC.APPROVAL_REQUEST, listener);
    return () => ipcRenderer.removeListener(IPC.APPROVAL_REQUEST, listener);
  },

  respondApproval: (response: ApprovalResponse) =>
    ipcRenderer.invoke(IPC.APPROVAL_RESPOND, response),

  // ─── Conversations ─────────────────────────────────────────────────────
  listConversations: () => ipcRenderer.invoke(IPC.CONV_LIST),
  getConversation: (id: string) => ipcRenderer.invoke(IPC.CONV_GET, id),
  getMessages: (id: string) => ipcRenderer.invoke(IPC.CONV_MESSAGES, id),
  createConversation: (conv: Conversation) => ipcRenderer.invoke(IPC.CONV_CREATE, conv),
  updateConversation: (id: string, updates: Partial<Conversation>) =>
    ipcRenderer.invoke(IPC.CONV_UPDATE, id, updates),
  deleteConversation: (id: string) => ipcRenderer.invoke(IPC.CONV_DELETE, id),

  // ─── Providers ─────────────────────────────────────────────────────────
  listProviders: () => ipcRenderer.invoke(IPC.PROVIDER_LIST),
  createProvider: (provider: unknown) => ipcRenderer.invoke(IPC.PROVIDER_CREATE, provider),
  updateProvider: (id: string, updates: unknown) =>
    ipcRenderer.invoke(IPC.PROVIDER_UPDATE, id, updates),
  deleteProvider: (id: string) => ipcRenderer.invoke(IPC.PROVIDER_DELETE, id),
  fetchModels: (id: string) => ipcRenderer.invoke(IPC.PROVIDER_FETCH_MODELS, id),

  // ─── Settings ──────────────────────────────────────────────────────────
  getSettings: () => ipcRenderer.invoke(IPC.SETTINGS_GET),
  setSettings: (settings: AppSettings) => ipcRenderer.invoke(IPC.SETTINGS_SET, settings),

  // ─── File System ───────────────────────────────────────────────────────
  listDir: (path: string) => ipcRenderer.invoke(IPC.FS_LIST, path),
  readFile: (path: string) => ipcRenderer.invoke(IPC.FS_READ, path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke(IPC.FS_WRITE, path, content),
  deleteFile: (path: string) => ipcRenderer.invoke(IPC.FS_DELETE, path),
  renameFile: (oldPath: string, newPath: string) =>
    ipcRenderer.invoke(IPC.FS_RENAME, oldPath, newPath),
  mkdir: (path: string) => ipcRenderer.invoke(IPC.FS_MKDIR, path),

  // ─── Workspace ─────────────────────────────────────────────────────────
  openWorkspace: () => ipcRenderer.invoke(IPC.WORKSPACE_OPEN),
  getWorkspace: () => ipcRenderer.invoke(IPC.WORKSPACE_GET),

  // ─── Terminal ──────────────────────────────────────────────────────────
  createTerminal: () => ipcRenderer.invoke(IPC.TERMINAL_CREATE),
  sendTerminalInput: (id: string, data: string) =>
    ipcRenderer.invoke(IPC.TERMINAL_INPUT, id, data),
  resizeTerminal: (id: string, cols: number, rows: number) =>
    ipcRenderer.invoke(IPC.TERMINAL_RESIZE, id, cols, rows),
  closeTerminal: (id: string) => ipcRenderer.invoke(IPC.TERMINAL_CLOSE, id),
  listTerminals: () => ipcRenderer.invoke(IPC.TERMINAL_LIST),

  onTerminalOutput: (callback: (data: { id: string; data: string }) => void) => {
    const listener = (_: Electron.IpcRendererEvent, data: { id: string; data: string }) =>
      callback(data);
    ipcRenderer.on(IPC.TERMINAL_OUTPUT, listener);
    return () => ipcRenderer.removeListener(IPC.TERMINAL_OUTPUT, listener);
  },

  // ─── Dialog ────────────────────────────────────────────────────────────
  openFileDialog: (options?: unknown) => ipcRenderer.invoke(IPC.DIALOG_OPEN_FILE, options),
  saveFileDialog: (options?: unknown) => ipcRenderer.invoke(IPC.DIALOG_SAVE_FILE, options),
  openFolderDialog: () => ipcRenderer.invoke(IPC.DIALOG_OPEN_FOLDER),

  // ─── Shell ─────────────────────────────────────────────────────────────
  openExternal: (url: string) => ipcRenderer.invoke(IPC.SHELL_OPEN_EXTERNAL, url),

  // ─── App ───────────────────────────────────────────────────────────────
  getVersion: () => ipcRenderer.invoke(IPC.APP_VERSION),
};

contextBridge.exposeInMainWorld('electronAPI', api);

export type ElectronAPI = typeof api;
