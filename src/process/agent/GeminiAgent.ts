import { AgentBackend } from './types';

export class GeminiAgent implements AgentBackend {
  readonly kind = 'gemini' as const;
  readonly alwaysOn = true;

  constructor(
    readonly name: string = 'gemini',
    readonly available: boolean = true,
    readonly config?: Record<string, unknown>
  ) {}

  get backend(): AgentBackend {
    return {
      kind: this.kind,
      name: this.name,
      available: this.available,
      config: this.config
    };
  }
}