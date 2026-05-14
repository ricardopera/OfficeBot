import { createOpenAI, openai } from '@ai-sdk/openai';
import type { LLMProvider } from './types';

/**
 * Creates an AI SDK provider instance from a stored LLMProvider configuration.
 */
export function createProviderInstance(provider: LLMProvider) {
  const apiKey = provider.apiKey;
  const baseURL = provider.baseURL;

  // Use createOpenAI for any OpenAI-compatible endpoint
  return createOpenAI({
    baseURL,
    apiKey,
    headers: buildHeaders(provider),
  });
}

function buildHeaders(provider: LLMProvider): Record<string, string> {
  const headers: Record<string, string> = {};

  // OpenRouter requires these headers
  if (provider.baseURL.includes('openrouter.ai')) {
    headers['HTTP-Referer'] = 'https://officebot.app';
    headers['X-Title'] = 'OfficeBot';
  }

  return headers;
}

/**
 * Fetches available models from a provider's API.
 */
export async function fetchProviderModels(
  provider: LLMProvider
): Promise<{ id: string; name: string }[]> {
  try {
    const response = await fetch(`${provider.baseURL}/models`, {
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
        ...buildHeaders(provider),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      data?: { id: string; name?: string }[];
      models?: { id: string; name?: string }[];
    };
    const list = data.data ?? data.models ?? [];

    return list.map((m) => ({
      id: m.id,
      name: m.name ?? m.id,
    }));
  } catch (err) {
    console.error('Failed to fetch models:', err);
    return [];
  }
}
