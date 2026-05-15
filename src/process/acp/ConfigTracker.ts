import { McpServerConfig } from './AcpSession';

export interface MergedMcpConfig {
  servers: McpServerConfig[];
  teamGuide?: string;
}

export interface ConfigSource {
  user?: McpServerConfig[];
  preset?: McpServerConfig[];
  team?: McpServerConfig[];
  teamGuide?: string;
}

export class ConfigTracker {
  private userConfig: McpServerConfig[] = [];
  private presetConfig: McpServerConfig[] = [];
  private teamConfig: McpServerConfig[] = [];
  private teamGuide: string | undefined;
  private mergedConfig: MergedMcpConfig | null = null;

  updateUserConfig(servers: McpServerConfig[]): void {
    this.userConfig = servers ? [...servers] : [];
    this.mergedConfig = null;
  }

  updatePresetConfig(servers: McpServerConfig[]): void {
    this.presetConfig = servers ? [...servers] : [];
    this.mergedConfig = null;
  }

  updateTeamConfig(servers: McpServerConfig[], teamGuide?: string): void {
    this.teamConfig = servers ? [...servers] : [];
    this.teamGuide = teamGuide;
    this.mergedConfig = null;
  }

  merge(): MergedMcpConfig {
    if (this.mergedConfig) {
      return this.mergedConfig;
    }

    const serverMap = new Map<string, McpServerConfig>();

    for (const server of this.presetConfig) {
      serverMap.set(server.name, { ...server });
    }

    for (const server of this.teamConfig) {
      const existing = serverMap.get(server.name);
      if (!existing) {
        serverMap.set(server.name, { ...server });
      }
    }

    for (const server of this.userConfig) {
      serverMap.set(server.name, { ...server });
    }

    this.mergedConfig = {
      servers: Array.from(serverMap.values()),
      teamGuide: this.teamGuide
    };

    return this.mergedConfig;
  }

  getServers(): McpServerConfig[] {
    return this.merge().servers;
  }

  getTeamGuide(): string | undefined {
    return this.merge().teamGuide;
  }

  hasTeamGuide(): boolean {
    return !!this.teamGuide;
  }

  injectTeamGuide(): void {
    if (this.teamGuide && !this.userConfig.some(s => s.name === 'team-guide')) {
      const teamGuideServer: McpServerConfig = {
        name: 'team-guide',
        command: 'echo',
        args: [this.teamGuide]
      };

      const merged = this.merge();
      merged.servers.unshift(teamGuideServer);
    }
  }

  getSourcePriority(): string[] {
    return ['user', 'preset', 'team'];
  }

  resolveServer(name: string): McpServerConfig | undefined {
    const merged = this.merge();
    return merged.servers.find(s => s.name === name);
  }

  listServers(): string[] {
    return this.merge().servers.map(s => s.name);
  }

  clear(): void {
    this.userConfig = [];
    this.presetConfig = [];
    this.teamConfig = [];
    this.teamGuide = undefined;
    this.mergedConfig = null;
  }

  getConfigSources(): ConfigSource {
    return {
      user: this.userConfig.length > 0 ? this.userConfig : undefined,
      preset: this.presetConfig.length > 0 ? this.presetConfig : undefined,
      team: this.teamConfig.length > 0 ? this.teamConfig : undefined,
      teamGuide: this.teamGuide
    };
  }
}

export function createConfigTracker(): ConfigTracker {
  return new ConfigTracker();
}