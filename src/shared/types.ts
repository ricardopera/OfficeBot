// Shared types for main ↔ renderer IPC communication

export type Language = 'pt-BR' | 'en';
export type Theme = 'light' | 'dark' | 'system';
export type ApprovalMode = 'safe' | 'semi-auto' | 'yolo' | 'custom';

// ─── Messages ───────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface ToolCallInfo {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
  error?: string;
  status: 'pending' | 'running' | 'done' | 'error' | 'awaiting-approval';
  startedAt?: number;
  finishedAt?: number;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  toolCalls?: ToolCallInfo[];
  tokensUsed?: number;
  createdAt: number;
  sequence: number;
  isStreaming?: boolean;
}

// ─── Conversations ───────────────────────────────────────────────────────────

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  workspacePath?: string;
  modelName?: string;
  isFavorite: boolean;
  isArchived: boolean;
  lastMessage?: string;
}

// ─── Providers & Models ─────────────────────────────────────────────────────

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  maxOutputTokens: number;
  pricing: { input: number; output: number };
}

export interface LLMProvider {
  id: string;
  name: string;
  baseURL: string;
  apiKey: string;
  defaultModel: string;
  models: ModelInfo[];
  supportsFunctionCalling: boolean;
  supportsStreaming: boolean;
}

// ─── Settings ────────────────────────────────────────────────────────────────

export interface ApprovalPolicy {
  toolName: string;
  autoApprove: boolean;
  conditions?: {
    pathPattern?: string;
    requireInWorkspace?: boolean;
    maxFileSize?: number;
  };
}

export interface AppSettings {
  language: Language;
  theme: Theme;
  fontSize: number;
  fontFamily: string;
  density: 'compact' | 'normal' | 'comfortable';
  approvalMode: ApprovalMode;
  approvalPolicies: ApprovalPolicy[];
  activeProviderId?: string;
  workspacePath?: string;
  customInstructions?: string;
  telemetryEnabled: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'pt-BR',
  theme: 'system',
  fontSize: 14,
  fontFamily: 'system',
  density: 'normal',
  approvalMode: 'semi-auto',
  approvalPolicies: [],
  telemetryEnabled: false
};

// ─── Tool Approval Request ───────────────────────────────────────────────────

export interface ApprovalRequest {
  requestId: string;
  toolName: string;
  args: Record<string, unknown>;
  diff?: string;
  timestamp: number;
}

export interface ApprovalResponse {
  requestId: string;
  approved: boolean;
  approveAll?: boolean;
}

// ─── Agent Events ─────────────────────────────────────────────────────────────

export interface AgentStreamEvent {
  type:
    | 'text_delta'
    | 'tool_start'
    | 'tool_result'
    | 'tool_error'
    | 'step_finish'
    | 'finish'
    | 'error';
  conversationId: string;
  messageId?: string;
  text?: string;
  toolCall?: ToolCallInfo;
  error?: string;
  usage?: { promptTokens: number; completionTokens: number };
}

// ─── File System ─────────────────────────────────────────────────────────────

export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: number;
  extension?: string;
  children?: FileEntry[];
}

// ─── Memory ──────────────────────────────────────────────────────────────────

export type MemoryType = 'user' | 'feedback' | 'project' | 'reference';

export interface Memory {
  id: string;
  type: MemoryType;
  name: string;
  description?: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

// ─── Terminal ────────────────────────────────────────────────────────────────

export interface TerminalSession {
  id: string;
  title: string;
  pid?: number;
  shell: string;
  createdAt: number;
}

// ─── Chat Send Request ────────────────────────────────────────────────────────

export interface SendMessageRequest {
  conversationId: string;
  message: string;
  attachments?: { name: string; path: string; type: string }[];
  providerId: string;
  modelId: string;
  maxSteps?: number;
}
