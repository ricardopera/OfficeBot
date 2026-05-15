import { AgentBackend } from './types';

export class OpenClawGateway implements AgentBackend {
  readonly kind = 'openclaw' as const;

  constructor(
    readonly name: string = 'openclaw-gateway',
    readonly available: boolean = true,
    readonly cliPath?: string,
    readonly config?: Record<string, unknown>
  ) {}

  get backend(): AgentBackend {
    return {
      kind: this.kind,
      name: this.normalizeName(this.name),
      available: this.available,
      cliPath: this.cliPath,
      config: this.normalizeConfig(this.config)
    };
  }

  private normalizeName(name: string): string {
    const normalized = name.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    return normalized === 'openclaw' ? 'openclaw-gateway' : normalized;
  }

  private normalizeConfig(config?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!config) return undefined;

    const result: Record<string, unknown> = { ...config };

    if (result.providerUrl) {
      result.providerUrl = this.normalizeProviderUrl(result.providerUrl as string);
    }

    return result;
  }

  private normalizeProviderUrl(url: string): string {
    let normalized = url.trim();

    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'https://' + normalized;
    }

    normalized = normalized.replace(/\/+$/, '');

    return normalized;
  }
}