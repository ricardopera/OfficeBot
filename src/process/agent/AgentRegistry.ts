import { AgentBackend, DetectedAgent } from './types';

export class AgentRegistry {
  private static readonly MERGE_PRIORITY: Record<string, number> = {
    aionrs: 1,
    gemini: 2,
    builtin: 3,
    other: 4,
    remote: 5,
    extension: 6,
    custom: 7
  };

  private readonly agents: Map<string, DetectedAgent> = new Map();
  private readonly cliDetector: import('./types').ICliDetector;

  constructor(cliDetector?: import('./types').ICliDetector) {
    this.cliDetector = cliDetector || new (require('./CliDetector').CliDetector)();
  }

  async detectAgents(): Promise<DetectedAgent[]> {
    const agents: DetectedAgent[] = [];

    agents.push(this.createAlwaysOnAgent('aionrs', 'AionRS Agent'));
    agents.push(this.createAlwaysOnAgent('gemini', 'Gemini Agent'));

    const acpPath = await this.cliDetector.exists('acp');
    if (acpPath) {
      agents.push({
        backend: { kind: 'acp', name: 'acp', available: true },
        alwaysOn: false,
        trusted: false
      });
    }

    const openclawPath = await this.cliDetector.exists('openclaw-gateway');
    if (openclawPath) {
      agents.push({
        backend: { kind: 'openclaw', name: 'openclaw-gateway', available: true },
        alwaysOn: false,
        trusted: false
      });
    }

    return agents;
  }

  registerAgent(agent: AgentBackend): void {
    const key = this.getDedupKey(agent);
    
    if (this.agents.has(key)) {
      const existing = this.agents.get(key)!;
      if (this.getPriority(existing.backend.kind) <= this.getPriority(agent.kind)) {
        return;
      }
    }

    const detected: DetectedAgent = {
      backend: agent,
      alwaysOn: this.isAlwaysOn(agent.kind),
      trusted: this.isTrusted(agent.kind)
    };

    this.agents.set(key, detected);
  }

  getAgent(kind: string): DetectedAgent | undefined {
    for (const agent of this.agents.values()) {
      if (agent.backend.kind === kind) {
        return agent;
      }
    }
    return undefined;
  }

  getAllAgents(): DetectedAgent[] {
    return Array.from(this.agents.values());
  }

  async refreshExtensionAgents(extensionId: string, agent: AgentBackend): Promise<void> {
    this.registerAgent({ ...agent, name: `${extensionId}:${agent.name}` });
  }

  private getDedupKey(agent: AgentBackend): string {
    if (agent.kind === 'remote' || agent.kind === 'custom') {
      return `${agent.kind}:${agent.name}`;
    }
    return agent.kind;
  }

  private getPriority(kind: string): number {
    return AgentRegistry.MERGE_PRIORITY[kind] ?? 4;
  }

  private isAlwaysOn(kind: string): boolean {
    return kind === 'gemini' || kind === 'aionrs';
  }

  private isTrusted(kind: string): boolean {
    return kind === 'extension';
  }

  private createAlwaysOnAgent(kind: string, name: string): DetectedAgent {
    return {
      backend: { kind: kind as 'gemini' | 'aionrs', name, available: true },
      alwaysOn: true,
      trusted: false
    };
  }
}