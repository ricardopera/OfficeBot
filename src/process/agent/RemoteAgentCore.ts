import { AgentBackend } from './types';

export interface RemoteAgentConfig {
  readonly id: string;
  readonly name: string;
  readonly url: string;
  readonly protocol?: string;
  readonly credentials?: Record<string, string>;
}

export class RemoteAgentCore implements AgentBackend {
  readonly kind = 'remote' as const;

  constructor(
    readonly config: RemoteAgentConfig
  ) {}

  get name(): string {
    return this.config.name;
  }

  get available(): boolean {
    return true;
  }

  get backend(): AgentBackend {
    return {
      kind: this.kind,
      name: this.name,
      available: this.available,
      config: {
        id: this.config.id,
        url: this.normalizeUrl(this.config.url),
        protocol: this.config.protocol,
        credentials: this.config.credentials
      }
    };
  }

  private normalizeUrl(url: string): string {
    let normalized = url.trim();

    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'https://' + normalized;
    }

    return normalized.replace(/\/+$/, '');
  }

  async healthCheck(): Promise<boolean> {
    try {
      const url = this.config.url;
      const response = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}