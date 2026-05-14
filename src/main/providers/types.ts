// LLM Provider types for the main process

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

export type ProviderType =
  | 'openrouter'
  | 'deepseek'
  | 'groq'
  | 'minimax'
  | 'zai'
  | 'generic';
