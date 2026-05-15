import { ModelConfig, AgentConfig } from './types';

export interface ModelConfigBridge {
  getConfig(conversationId: string): Promise<AgentConfig | null>;
  updateConfig(conversationId: string, config: AgentConfig): Promise<boolean>;
  compareConfig(oldConfig: AgentConfig, newConfig: AgentConfig): boolean;
  getModelFromConfig(config: AgentConfig): string;
  getProviderFromConfig(config: AgentConfig): string;
}

export function createModelConfigBridge(): ModelConfigBridge {
  const configCache = new Map<string, AgentConfig>();

  function getConfig(conversationId: string): Promise<AgentConfig | null> {
    return Promise.resolve(configCache.get(conversationId) || null);
  }

  function updateConfig(conversationId: string, config: AgentConfig): Promise<boolean> {
    configCache.set(conversationId, config);
    return Promise.resolve(true);
  }

  function compareConfig(oldConfig: AgentConfig, newConfig: AgentConfig): boolean {
    return JSON.stringify(oldConfig) !== JSON.stringify(newConfig);
  }

  function getModelFromConfig(config: AgentConfig): string {
    return config.model || '';
  }

  function getProviderFromConfig(config: AgentConfig): string {
    return config.backend || config.provider || '';
  }

  return {
    getConfig,
    updateConfig,
    compareConfig,
    getModelFromConfig,
    getProviderFromConfig,
  };
}

export function detectModelChange(
  oldConfig: AgentConfig | null,
  newConfig: AgentConfig
): boolean {
  if (!oldConfig) return false;
  return JSON.stringify(oldConfig) !== JSON.stringify(newConfig);
}

export function normalizeModelConfig(config: AgentConfig): AgentConfig {
  const normalized: AgentConfig = { ...config };

  if (!normalized.backend && normalized.provider) {
    normalized.backend = normalized.provider;
  }

  if (!normalized.backend && !normalized.provider) {
    normalized.backend = 'openai';
  }

  return normalized;
}