import type { IpcMain, BrowserWindow, OpenDialogOptions } from 'electron';
import { dialog, shell } from 'electron';
import { readdirSync, readFileSync, writeFileSync, unlinkSync, renameSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';
import { IPC } from '@shared/ipc-channels';
import type { SendMessageRequest, ApprovalResponse, AppSettings, Conversation, Message, Memory } from '@shared/types';
import { DEFAULT_SETTINGS } from '@shared/types';
import type { DatabaseService } from '../services/Database';
import type { TerminalService } from '../services/Terminal';
import { ProviderRegistry } from '../providers/registry';
import { fetchProviderModels } from '../providers/factory';
import { ApprovalEngine } from '../agent/ApprovalEngine';
import { ContextManager } from '../agent/ContextManager';
import { assembleSystemPrompt, formatMemoriesForPrompt } from '../agent/SystemPrompt';
import { runAgent } from '../agent/AgentLoop';
import { createToolSet } from '../agent/tools/index';
import { sanitizePath } from '../services/FileSystem';
import { APP_VERSION, DEFAULT_CONTEXT_WINDOW_TOKENS, CONTEXT_COMPRESSION_THRESHOLD } from '@shared/constants';
import type { CoreMessage } from 'ai';

const activeAgentControllers = new Map<string, AbortController>();

function toCoreMessage(role: string, content: string): CoreMessage | null {
  switch (role) {
    case 'user':
      return { role: 'user', content };
    case 'assistant':
      return { role: 'assistant', content };
    default:
      return null;
  }
}

export function registerIpcHandlers(
  ipcMain: IpcMain,
  db: DatabaseService,
  terminalService: TerminalService,
  getWindow: () => BrowserWindow | null
): void {
  const providerRegistry = new ProviderRegistry(db);
  const contextManager = new ContextManager();

  // Approval engine - sends requests to renderer
  const approvalEngine = new ApprovalEngine((request) => {
    getWindow()?.webContents.send(IPC.APPROVAL_REQUEST, request);
  });

  // ─── App ─────────────────────────────────────────────────────────────────

  ipcMain.handle(IPC.APP_VERSION, () => {
    return APP_VERSION;
  });

  // ─── Agent ───────────────────────────────────────────────────────────────

  ipcMain.handle(IPC.AGENT_SEND_MESSAGE, async (_event, req: SendMessageRequest) => {
    const settings = db.getSetting<AppSettings>('settings') ?? DEFAULT_SETTINGS;
    const workspacePath = settings.workspacePath ?? process.env.HOME ?? '/tmp';
    const provider = providerRegistry.get(req.providerId);

    if (!provider) {
      return { success: false, error: 'Provedor não encontrado' };
    }

    // Get or create conversation
    let conversation = db.getConversation(req.conversationId);
    if (!conversation) {
      conversation = {
        id: req.conversationId,
        title: req.message.slice(0, 50),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        workspacePath,
        modelName: req.modelId,
        isFavorite: false,
        isArchived: false,
      };
      db.createConversation(conversation);
    }

    // Build message history
    const savedMessages = db.getMessages(req.conversationId);
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // Save user message
    const userMsg: Message = {
      id: `msg_user_${Date.now()}`,
      conversationId: req.conversationId,
      role: 'user',
      content: req.message,
      createdAt: Date.now(),
      sequence: savedMessages.length,
    };
    db.saveMessage(userMsg);

    // Prepare CoreMessages and compress if history is large
    let coreMessages: CoreMessage[] = [
      ...savedMessages
        .map((m) => toCoreMessage(m.role, m.content))
        .filter((m): m is CoreMessage => m !== null),
      { role: 'user', content: req.message },
    ];

    // Compress history when it grows large (uses default 128k token budget)
    const estimatedTokens = contextManager.estimateTokens(coreMessages);
    if (estimatedTokens / DEFAULT_CONTEXT_WINDOW_TOKENS >= CONTEXT_COMPRESSION_THRESHOLD) {
      coreMessages = contextManager.compressHistory(coreMessages);
    }

    // Assemble system prompt (include user memories)
    const memories = db.listMemories();
    const systemPrompt = assembleSystemPrompt({
      workspacePath,
      language: settings.language,
      approvalMode: settings.approvalMode,
      customInstructions: settings.customInstructions,
      memories: formatMemoriesForPrompt(memories),
    });

    // Configure approval engine
    approvalEngine.setMode(settings.approvalMode, settings.approvalPolicies);

    // Create tools (pass search API keys from settings)
    const tools = createToolSet(workspacePath, approvalEngine, settings.tavilyApiKey, settings.braveApiKey);

    // AbortController for stopping
    const abortController = new AbortController();
    activeAgentControllers.set(req.conversationId, abortController);

    // Create assistant message placeholder
    const assistantMsgId = messageId;
    let fullText = '';

    await runAgent({
      provider,
      modelId: req.modelId,
      systemPrompt,
      messages: coreMessages,
      tools,
      maxSteps: req.maxSteps ?? 20,
      conversationId: req.conversationId,
      messageId: assistantMsgId,
      signal: abortController.signal,
      onEvent: (event) => {
        // Forward to renderer
        getWindow()?.webContents.send(IPC.AGENT_STREAM_EVENT, event);

        // Accumulate text
        if (event.type === 'text_delta' && event.text) {
          fullText += event.text;
        }

        // Save finished message
        if (event.type === 'finish') {
          const assistantMsg: Message = {
            id: assistantMsgId,
            conversationId: req.conversationId,
            role: 'assistant',
            content: fullText,
            createdAt: Date.now(),
            sequence: savedMessages.length + 1,
            tokensUsed: event.usage
              ? event.usage.promptTokens + event.usage.completionTokens
              : undefined,
          };
          db.saveMessage(assistantMsg);
          db.updateConversation(req.conversationId, { updatedAt: Date.now() });
          activeAgentControllers.delete(req.conversationId);
          approvalEngine.resetApproveAll();
        }
      },
    });

    return { success: true };
  });

  ipcMain.handle(IPC.AGENT_STOP, (_event, conversationId: string) => {
    const controller = activeAgentControllers.get(conversationId);
    if (controller) {
      controller.abort();
      activeAgentControllers.delete(conversationId);
    }
    return { success: true };
  });

  // ─── Approval ─────────────────────────────────────────────────────────────

  ipcMain.handle(IPC.APPROVAL_RESPOND, (_event, response: ApprovalResponse) => {
    approvalEngine.respond(response);
    return { success: true };
  });

  // ─── Conversations ─────────────────────────────────────────────────────────

  ipcMain.handle(IPC.CONV_LIST, () => db.listConversations());
  ipcMain.handle(IPC.CONV_GET, (_event, id: string) => db.getConversation(id));
  ipcMain.handle(IPC.CONV_MESSAGES, (_event, id: string) => db.getMessages(id));

  ipcMain.handle(IPC.CONV_CREATE, (_event, conv: Conversation) => {
    db.createConversation(conv);
    return conv;
  });

  ipcMain.handle(IPC.CONV_UPDATE, (_event, id: string, updates: Partial<Conversation>) => {
    db.updateConversation(id, updates);
    return { success: true };
  });

  ipcMain.handle(IPC.CONV_DELETE, (_event, id: string) => {
    db.deleteConversation(id);
    return { success: true };
  });

  ipcMain.handle(IPC.CONV_IMPORT, async () => {
    const result = await dialog.showOpenDialog(getWindow()!, {
      title: 'Import conversations',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    try {
      const content = readFileSync(result.filePaths[0], 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  });

  // ─── Memories ──────────────────────────────────────────────────────────────

  ipcMain.handle(IPC.MEMORY_LIST, () => db.listMemories());

  ipcMain.handle(IPC.MEMORY_CREATE, (_event, mem: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = `memory_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const now = Date.now();
    const full: Memory = { id, ...mem, createdAt: now, updatedAt: now };
    db.saveMemory(full);
    return full;
  });

  ipcMain.handle(IPC.MEMORY_UPDATE, (_event, id: string, updates: Partial<Pick<Memory, 'name' | 'description' | 'content' | 'type'>>) => {
    const existing = db.listMemories().find((m) => m.id === id);
    if (!existing) return { success: false };
    db.saveMemory({ ...existing, ...updates, id, updatedAt: Date.now() });
    return { success: true };
  });

  ipcMain.handle(IPC.MEMORY_DELETE, (_event, id: string) => {
    db.deleteMemory(id);
    return { success: true };
  });

  // ─── Providers ─────────────────────────────────────────────────────────────

  ipcMain.handle(IPC.PROVIDER_LIST, () => providerRegistry.list());
  ipcMain.handle(IPC.PROVIDER_CREATE, (_event, provider) => providerRegistry.create(provider));
  ipcMain.handle(IPC.PROVIDER_UPDATE, (_event, id: string, updates) => providerRegistry.update(id, updates));
  ipcMain.handle(IPC.PROVIDER_DELETE, (_event, id: string) => providerRegistry.delete(id));

  ipcMain.handle(IPC.PROVIDER_FETCH_MODELS, async (_event, id: string) => {
    const provider = providerRegistry.get(id);
    if (!provider) return { success: false, models: [] };
    const models = await fetchProviderModels(provider);
    return { success: true, models };
  });

  ipcMain.handle(IPC.PROVIDER_FETCH_MODELS_DRAFT, async (_event, draft: { baseURL: string; apiKey: string }) => {
    const models = await fetchProviderModels({
      id: 'draft',
      name: 'draft',
      baseURL: draft.baseURL,
      apiKey: draft.apiKey,
      defaultModel: '',
      models: [],
      supportsFunctionCalling: true,
      supportsStreaming: true,
    });
    return { success: true, models };
  });

  // ─── Settings ──────────────────────────────────────────────────────────────

  ipcMain.handle(IPC.SETTINGS_GET, () => {
    return db.getSetting<AppSettings>('settings') ?? DEFAULT_SETTINGS;
  });

  ipcMain.handle(IPC.SETTINGS_SET, (_event, settings: AppSettings) => {
    db.setSetting('settings', settings);
    return { success: true };
  });

  // ─── File System ───────────────────────────────────────────────────────────

  ipcMain.handle(IPC.FS_LIST, (_event, dirPath: string) => {
    const settings = db.getSetting<AppSettings>('settings') ?? DEFAULT_SETTINGS;
    const workspacePath = settings.workspacePath ?? process.env.HOME ?? '/tmp';

    try {
      const safePath = sanitizePath(workspacePath, dirPath || '.');
      const entries = readdirSync(safePath, { withFileTypes: true });
      return entries.map((entry) => {
        const fullPath = join(safePath, entry.name);
        const stat = statSync(fullPath);
        return {
          name: entry.name,
          path: join(dirPath || '.', entry.name),
          type: entry.isDirectory() ? 'directory' : 'file',
          size: stat.size,
          modified: stat.mtimeMs,
          extension: entry.name.includes('.') ? entry.name.split('.').pop() : undefined,
        };
      });
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.FS_READ, (_event, filePath: string) => {
    const settings = db.getSetting<AppSettings>('settings') ?? DEFAULT_SETTINGS;
    const workspacePath = settings.workspacePath ?? process.env.HOME ?? '/tmp';
    try {
      const safePath = sanitizePath(workspacePath, filePath);
      return { content: readFileSync(safePath, 'utf-8') };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.FS_WRITE, (_event, filePath: string, content: string) => {
    const settings = db.getSetting<AppSettings>('settings') ?? DEFAULT_SETTINGS;
    const workspacePath = settings.workspacePath ?? process.env.HOME ?? '/tmp';
    try {
      const safePath = sanitizePath(workspacePath, filePath);
      writeFileSync(safePath, content, 'utf-8');
      return { success: true };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.FS_DELETE, (_event, filePath: string) => {
    const settings = db.getSetting<AppSettings>('settings') ?? DEFAULT_SETTINGS;
    const workspacePath = settings.workspacePath ?? process.env.HOME ?? '/tmp';
    try {
      const safePath = sanitizePath(workspacePath, filePath);
      unlinkSync(safePath);
      return { success: true };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.FS_RENAME, (_event, oldPath: string, newPath: string) => {
    const settings = db.getSetting<AppSettings>('settings') ?? DEFAULT_SETTINGS;
    const workspacePath = settings.workspacePath ?? process.env.HOME ?? '/tmp';
    try {
      const safeOld = sanitizePath(workspacePath, oldPath);
      const safeNew = sanitizePath(workspacePath, newPath);
      renameSync(safeOld, safeNew);
      return { success: true };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.FS_MKDIR, (_event, dirPath: string) => {
    const settings = db.getSetting<AppSettings>('settings') ?? DEFAULT_SETTINGS;
    const workspacePath = settings.workspacePath ?? process.env.HOME ?? '/tmp';
    try {
      const safePath = sanitizePath(workspacePath, dirPath);
      mkdirSync(safePath, { recursive: true });
      return { success: true };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  // ─── Workspace ─────────────────────────────────────────────────────────────

  ipcMain.handle(IPC.WORKSPACE_OPEN, async () => {
    const result = await dialog.showOpenDialog(getWindow()!, {
      properties: ['openDirectory'],
      title: 'Abrir pasta de trabalho',
    });
    if (result.canceled || result.filePaths.length === 0) return null;

    const workspacePath = result.filePaths[0];
    const settings = db.getSetting<AppSettings>('settings') ?? DEFAULT_SETTINGS;
    db.setSetting('settings', { ...settings, workspacePath });
    return workspacePath;
  });

  ipcMain.handle(IPC.WORKSPACE_GET, () => {
    const settings = db.getSetting<AppSettings>('settings') ?? DEFAULT_SETTINGS;
    return settings.workspacePath ?? null;
  });

  // ─── Terminal ──────────────────────────────────────────────────────────────

  ipcMain.handle(IPC.TERMINAL_CREATE, async () => {
    const settings = db.getSetting<AppSettings>('settings') ?? DEFAULT_SETTINGS;
    return terminalService.create(settings.workspacePath);
  });

  ipcMain.handle(IPC.TERMINAL_INPUT, (_event, id: string, data: string) => {
    terminalService.write(id, data);
  });

  ipcMain.handle(IPC.TERMINAL_RESIZE, (_event, id: string, cols: number, rows: number) => {
    terminalService.resize(id, cols, rows);
  });

  ipcMain.handle(IPC.TERMINAL_CLOSE, (_event, id: string) => {
    terminalService.close(id);
    return { success: true };
  });

  ipcMain.handle(IPC.TERMINAL_LIST, () => terminalService.list());

  // ─── Dialog ─────────────────────────────────────────────────────────────────

  ipcMain.handle(IPC.DIALOG_OPEN_FILE, async (_event, options: OpenDialogOptions) => {
    const result = await dialog.showOpenDialog(getWindow()!, options);
    return result;
  });

  ipcMain.handle(IPC.DIALOG_SAVE_FILE, async (_event, options) => {
    const result = await dialog.showSaveDialog(getWindow()!, options);
    return result;
  });

  ipcMain.handle(IPC.DIALOG_OPEN_FOLDER, async () => {
    const result = await dialog.showOpenDialog(getWindow()!, {
      properties: ['openDirectory'],
    });
    return result;
  });

  // ─── Shell ───────────────────────────────────────────────────────────────

  ipcMain.handle(IPC.SHELL_OPEN_EXTERNAL, (_event, url: string) => {
    shell.openExternal(url);
  });
}
