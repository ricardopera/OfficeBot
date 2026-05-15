import { AgentBackend } from './types';

export class AionrsAgent implements AgentBackend {
  readonly kind = 'aionrs' as const;
  readonly alwaysOn = true;

  constructor(
    readonly name: string = 'aionrs',
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