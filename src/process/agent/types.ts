export interface AgentBackend {
  readonly kind: 'gemini' | 'aionrs' | 'acp' | 'openclaw' | 'nanobot' | 'remote' | 'extension' | 'custom';
  readonly name: string;
  readonly version?: string;
  readonly available: boolean;
  readonly cliPath?: string;
  readonly config?: Record<string, unknown>;
}

export interface DetectedAgent {
  readonly backend: AgentBackend;
  readonly alwaysOn: boolean;
  readonly trusted: boolean;
}

export interface IAgentRegistry {
  detectAgents(): Promise<DetectedAgent[]>;
  registerAgent(agent: AgentBackend): void;
  getAgent(kind: string): DetectedAgent | undefined;
  getAllAgents(): DetectedAgent[];
}

export interface ICliDetector {
  exists(cliName: string): Promise<boolean>;
  sanitize(cliName: string): boolean;
}