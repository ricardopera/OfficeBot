import { AgentConfig, NormalizedUrl, ProtocolDetectionResult, TProviderWithModel } from './types';

export interface ProviderBridge {
  normalizeUrl(rawUrl: string): NormalizedUrl;
  detectProtocol(url: string): ProtocolDetectionResult;
  remapCodexType(type: string, extra?: Record<string, unknown>): { type: string; extra?: Record<string, unknown> };
  getBackendForProvider(provider: string): string;
  buildAgentConfig(provider: string, model: string, apiKey?: string, apiBase?: string): AgentConfig;
}

export function createProviderBridge(): ProviderBridge {
  const PROTOCOL_PATTERNS = {
    openai: /api\.openai\.com|openai\.com/,
    anthropic: /api\.anthropic\.com|anthropic\.com/,
    google: /generativelanguage\.googleapis\.com|googleapis\.com/,
    bedrock: /bedrock|aws\.amazon\.com/,
  };

  function normalizeUrl(rawUrl: string): NormalizedUrl {
    let normalized = rawUrl.trim();
    const hasApiKey = /sk-[a-zA-Z0-9]/.test(normalized);
    const hasApiBase = /api_base|base_url/i.test(normalized);

    let protocol: NormalizedUrl['protocol'] = 'custom';

    for (const [p, pattern] of Object.entries(PROTOCOL_PATTERNS)) {
      if (pattern.test(normalized)) {
        protocol = p as NormalizedUrl['protocol'];
        break;
      }
    }

    return {
      original: rawUrl,
      normalized,
      protocol,
      hasApiKey,
      hasApiBase,
    };
  }

  function detectProtocol(url: string): ProtocolDetectionResult {
    const normalized = normalizeUrl(url);
    const protocol = normalized.protocol;

    let provider = 'openai';
    let model = 'gpt-4o';

    switch (protocol) {
      case 'openai':
        provider = 'openai';
        model = extractModelFromUrl(url) || 'gpt-4o';
        break;
      case 'anthropic':
        provider = 'anthropic';
        model = extractModelFromUrl(url) || 'claude-sonnet-4-20250514';
        break;
      case 'google':
        provider = 'google';
        model = extractModelFromUrl(url) || 'gemini-2.5-flash';
        break;
      case 'bedrock':
        provider = 'bedrock';
        model = extractModelFromUrl(url) || 'claude-3-sonnet';
        break;
      default:
        provider = 'openai';
        model = extractModelFromUrl(url) || 'gpt-4o';
    }

    return {
      protocol,
      provider,
      model,
      confidence: 0.9,
      normalized,
    };
  }

  function extractModelFromUrl(url: string): string | null {
    const modelMatch = url.match(/model[=/]([a-zA-Z0-9\-_.]+)/i);
    return modelMatch ? modelMatch[1] : null;
  }

  function remapCodexType(type: string, extra?: Record<string, unknown>): { type: string; extra?: Record<string, unknown> } {
    if (type === 'codex') {
      return {
        type: 'acp',
        extra: {
          ...extra,
          backend: 'codex',
        },
      };
    }
    return { type, extra };
  }

  function getBackendForProvider(provider: string): string {
    const providerMap: Record<string, string> = {
      openai: 'openai',
      anthropic: 'anthropic',
      google: 'google',
      gemini: 'google',
      bedrock: 'bedrock',
      'openclaw-gateway': 'openclaw-gateway',
      acp: 'acp',
      aionrs: 'aionrs',
      nanobot: 'nanobot',
      remote: 'remote',
    };
    return providerMap[provider.toLowerCase()] || 'openai';
  }

  function buildAgentConfig(
    provider: string,
    model: string,
    apiKey?: string,
    apiBase?: string
  ): AgentConfig {
    const backend = getBackendForProvider(provider);
    const config: AgentConfig = { backend, model };

    if (apiKey) {
      config.api_key = apiKey;
    }
    if (apiBase) {
      config.api_base = apiBase;
    }
    if (provider === 'google' || provider === 'gemini') {
      config.provider = 'google';
    }

    return config;
  }

  return {
    normalizeUrl,
    detectProtocol,
    remapCodexType,
    getBackendForProvider,
    buildAgentConfig,
  };
}

export function normalizeOpenclawGateway(rawUrl: string): NormalizedUrl {
  const normalized = rawUrl.replace(/\/v1$/, '').replace(/\/chat$/, '');
  return {
    original: rawUrl,
    normalized,
    protocol: 'openai',
    hasApiKey: /sk-[a-zA-Z0-9]/.test(rawUrl),
    hasApiBase: true,
  };
}

export function remapCodexToAcp(
  type: string,
  extra?: Record<string, unknown>
): { type: string; extra: Record<string, unknown> } {
  if (type !== 'codex') {
    return { type, extra: extra || {} };
  }
  return {
    type: 'acp',
    extra: { ...extra, backend: 'codex' },
  };
}

export function getDefaultProviderConfig(): TProviderWithModel[] {
  return [
    { provider: 'openai', model: 'gpt-4o' },
    { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
    { provider: 'google', model: 'gemini-2.5-flash' },
  ];
}