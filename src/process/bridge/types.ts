export type IpcTransportType = 'electron' | 'websocket' | 'standalone';

export interface TProviderResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface TEmitterPayload {
  event: string;
  data: unknown;
  timestamp?: number;
}

export interface BridgeConfig {
  name: string;
  transport: IpcTransportType;
  maxPayloadSize?: number;
  enableBackoff?: boolean;
  enableAuth?: boolean;
}

export interface IpcProviderOptions<TParams = unknown, TResult = unknown> {
  name: string;
  transport: IpcTransportType;
  handler: (params: TParams) => Promise<TResult>;
  validator?: (params: TParams) => boolean;
  timeout?: number;
}

export interface IpcEmitterOptions<TPayload = unknown> {
  name: string;
  transport: IpcTransportType;
  validator?: (payload: TPayload) => boolean;
  maxQueueSize?: number;
}

export interface ConversationType {
  type: 'gemini' | 'acp' | 'openclaw-gateway' | 'nanobot' | 'remote' | 'aionrs';
  backend?: string;
  extra?: Record<string, unknown>;
}

export interface ModelConfig {
  provider: string;
  model: string;
  api_key?: string;
  api_base?: string;
  config?: Record<string, unknown>;
}

export interface TProviderWithModel {
  provider: string;
  model: string;
  config?: ModelConfig;
}

export interface AgentConfig {
  backend: string;
  model: string;
  provider?: string;
  api_key?: string;
  api_base?: string;
  [key: string]: unknown;
}

export interface NormalizedUrl {
  original: string;
  normalized: string;
  protocol: 'openai' | 'anthropic' | 'google' | 'bedrock' | 'custom';
  hasApiKey: boolean;
  hasApiBase: boolean;
}

export interface ProtocolDetectionResult {
  protocol: 'openai' | 'anthropic' | 'google' | 'bedrock' | 'custom';
  provider: string;
  model: string;
  confidence: number;
  normalized: NormalizedUrl;
}

export interface ModelListResponse {
  models: Array<{
    id: string;
    provider: string;
    name: string;
    supports?: string[];
  }>;
  provider: string;
}

export interface SkillInfo {
  id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
}

export interface SkillsDiscoveryResult {
  skills: SkillInfo[];
  conversationType: string;
  timestamp: number;
}

export interface BridgeEmitterEvents {
  'bridge:error': { code: string; reason: string; size?: number };
  'bridge:payload_dropped': { event: string; size: number };
  'bridge:connected': { transport: IpcTransportType };
  'bridge:disconnected': { transport: IpcTransportType };
}

export interface ModelChangeEvent {
  conversationId: string;
  oldModel: string;
  newModel: string;
  timestamp: number;
}

export interface AuthExpiredEvent {
  code: number;
  reason: string;
  redirectUrl: string;
}