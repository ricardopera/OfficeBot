import { ModelListResponse, SkillsDiscoveryResult, SkillInfo, TProviderWithModel } from './types';

export interface ModelListBridge {
  listModels(provider?: string): Promise<ModelListResponse>;
  discoverSkills(conversationType: string): Promise<SkillsDiscoveryResult>;
  getDefaultModels(): TProviderWithModel[];
}

export function createModelListBridge(): ModelListBridge {
  const skillsCache = new Map<string, SkillInfo[]>();

  async function listModels(provider?: string): Promise<ModelListResponse> {
    const defaultModels: TProviderWithModel[] = [
      { provider: 'openai', model: 'gpt-4o' },
      { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
      { provider: 'google', model: 'gemini-2.5-flash' },
    ];

    if (provider) {
      const filtered = defaultModels.filter(m => m.provider === provider);
      return {
        models: filtered.map(m => ({
          id: m.model,
          provider: m.provider,
          name: m.model,
          supports: ['chat', 'completion'],
        })),
        provider,
      };
    }

    return {
      models: defaultModels.map(m => ({
        id: m.model,
        provider: m.provider,
        name: m.model,
        supports: ['chat', 'completion'],
      })),
      provider: 'multi',
    };
  }

  async function discoverSkills(conversationType: string): Promise<SkillsDiscoveryResult> {
    const defaultSkills: SkillInfo[] = [
      {
        id: 'coding',
        name: 'Coding Assistant',
        description: 'Code generation, review, and explanation',
        version: '1.0.0',
        enabled: true,
      },
      {
        id: 'research',
        name: 'Research Assistant',
        description: 'Web search and information gathering',
        version: '1.0.0',
        enabled: true,
      },
      {
        id: 'writing',
        name: 'Writing Assistant',
        description: 'Content creation and editing',
        version: '1.0.0',
        enabled: true,
      },
    ];

    return {
      skills: defaultSkills,
      conversationType,
      timestamp: Date.now(),
    };
  }

  function getDefaultModels(): TProviderWithModel[] {
    return [
      { provider: 'openai', model: 'gpt-4o' },
      { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
      { provider: 'google', model: 'gemini-2.5-flash' },
    ];
  }

  return {
    listModels,
    discoverSkills,
    getDefaultModels,
  };
}

export const DEFAULT_PROVIDERS: TProviderWithModel[] = [
  { provider: 'openai', model: 'gpt-4o' },
  { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  { provider: 'google', model: 'gemini-2.5-flash' },
  { provider: 'openai', model: 'gpt-4o-mini' },
  { provider: 'anthropic', model: 'claude-3-5-haiku-20250514' },
  { provider: 'google', model: 'gemini-1.5-flash' },
];

export function filterModelsByProvider(models: TProviderWithModel[], provider: string): TProviderWithModel[] {
  return models.filter(m => m.provider === provider);
}

export function formatModelList(models: TProviderWithModel[]): ModelListResponse {
  return {
    models: models.map(m => ({
      id: m.model,
      provider: m.provider,
      name: m.model,
      supports: ['chat', 'completion'],
    })),
    provider: 'multi',
  };
}