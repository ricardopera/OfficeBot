import { AgentBackend } from './types';

export interface NanobotConfig {
  readonly url: string;
  readonly protocol?: string;
  readonly credentials?: Record<string, string>;
}

export class NanobotConnection implements AgentBackend {
  readonly kind = 'nanobot' as const;

  constructor(
    readonly name: string,
    readonly available: boolean,
    readonly config?: NanobotConfig
  ) {}

  get backend(): AgentBackend {
    return {
      kind: this.kind,
      name: this.name,
      available: this.available,
      config: this.config as Record<string, unknown>
    };
  }

  async connect(): Promise<boolean> {
    if (!this.config?.url) {
      return false;
    }

    try {
      const response = await fetch(this.config.url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}