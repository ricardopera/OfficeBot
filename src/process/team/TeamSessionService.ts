import { randomUUID } from 'crypto';
import { inject, injectable } from 'tsyringe';
import type { AgentRuntime } from '../../foundation/index.js';
import { database } from '../../database/index.js';
import type { ICreateTeamParams, TTeam, TeamAgent, TeammateStatus, WorkspaceMode } from '../../common/types/teamTypes.js';
import { TeamEventBus } from './teamEventBus.js';

export const TEAM_CAPABLE_BACKENDS = ['gemini', 'claude', 'codex', 'aionrs'] as const;
export type TeamCapableBackend = typeof TEAM_CAPABLE_BACKENDS[number];

export function isTeamCapableBackend(backend: string): boolean {
  return TEAM_CAPABLE_BACKENDS.includes(backend as TeamCapableBackend);
}

@injectable()
export class TeamSessionService {
  private readonly teams = new Map<string, TTeam>();
  private readonly sessions = new Map<string, { mcpServer: TeamMcpServer; startedAt: number }>();
  private readonly mutexes = new Map<string, Promise<void>>();

  constructor(
    @inject(TeamEventBus) private readonly eventBus: TeamEventBus
  ) {}

  async createTeam(params: ICreateTeamParams): Promise<TTeam> {
    const teamId = randomUUID();
    const now = Date.now();

    const leader = params.agents.find(a => a.role === 'leader');
    if (!leader) {
      throw new Error('Team must have at least one leader');
    }

    const team: TTeam = {
      id: teamId,
      userId: params.userId,
      name: params.name,
      workspace: params.workspace,
      workspaceMode: params.workspaceMode,
      leaderAgentId: leader.slotId,
      agents: params.agents.map((agent, index) => ({
        ...agent,
        slotId: agent.slotId ?? `slot-${randomUUID().slice(0, 8)}`,
        conversationId: agent.conversationId ?? randomUUID(),
        status: 'pending' as TeammateStatus,
        createdAt: now,
        updatedAt: now,
      })),
      sessionMode: params.sessionMode,
      createdAt: now,
      updatedAt: now,
    };

    this.teams.set(teamId, team);
    this.eventBus.emit('team:created', { teamId, team });

    return team;
  }

  async addAgent(teamId: string, agent: Partial<TeamAgent>): Promise<TeamAgent> {
    const mutexKey = `team:${teamId}`;
    await this.acquireMutex(mutexKey);

    try {
      const team = this.teams.get(teamId);
      if (!team) throw new Error('Team not found');

      const agentId = `slot-${randomUUID().slice(0, 8)}`;
      const now = Date.now();

      const newAgent: TeamAgent = {
        slotId: agentId,
        conversationId: agent.conversationId ?? randomUUID(),
        role: agent.role ?? 'teammate',
        agentType: agent.agentType ?? 'gemini',
        agentName: agent.agentName ?? 'Unnamed Agent',
        conversationType: agent.conversationType ?? 'acp',
        status: 'pending',
        cliPath: agent.cliPath,
        customAgentId: agent.customAgentId,
        model: agent.model,
        createdAt: now,
        updatedAt: now,
      };

      team.agents.push(newAgent);
      team.updatedAt = now;
      this.teams.set(teamId, team);

      this.eventBus.emit('team:agent_added', { teamId, agent: newAgent });
      return newAgent;
    } finally {
      this.releaseMutex(mutexKey);
    }
  }

  async removeAgent(teamId: string, slotId: string): Promise<void> {
    const team = this.teams.get(teamId);
    if (!team) throw new Error('Team not found');

    const agent = team.agents.find(a => a.slotId === slotId);
    if (!agent) throw new Error('Agent not found');

    if (agent.role === 'leader') {
      throw new Error('Leader cannot be removed from the team');
    }

    team.agents = team.agents.filter(a => a.slotId !== slotId);
    team.updatedAt = Date.now();
    this.teams.set(teamId, team);

    this.eventBus.emit('team:agent_removed', { teamId, slotId });
  }

  async renameAgent(teamId: string, slotId: string, newName: string): Promise<void> {
    const team = this.teams.get(teamId);
    if (!team) throw new Error('Team not found');

    const agent = team.agents.find(a => a.slotId === slotId);
    if (!agent) throw new Error('Agent not found');

    const normalizedOldName = this.normalize(agent.agentName);
    const normalizedNewName = this.normalize(newName);

    const isDuplicate = team.agents.some(a =>
      a.slotId !== slotId && this.normalize(a.agentName) === normalizedNewName
    );
    if (isDuplicate) {
      throw new Error('Agent name already exists in team');
    }

    const formerName = agent.agentName;
    agent.agentName = newName;
    agent.updatedAt = Date.now();

    this.eventBus.emit('team:agent_renamed', { teamId, slotId, oldName: formerName, newName });
  }

  async sendMessage(teamId: string, content: string, files?: string[]): Promise<void> {
    const team = this.teams.get(teamId);
    if (!team) throw new Error('Team not found');

    const leaderAgent = team.agents.find(a => a.role === 'leader');
    if (!leaderAgent) throw new Error('Team has no leader');

    await this.sendMessageToAgent(teamId, leaderAgent.slotId, content, { from: 'user', files });
  }

  async sendMessageToAgent(
    teamId: string,
    toSlotId: string,
    content: string,
    options?: { from?: string; silent?: boolean; files?: string[] }
  ): Promise<void> {
    const team = this.teams.get(teamId);
    if (!team) throw new Error('Team not found');

    const fromAgentId = options?.from ?? 'user';
    const message: MailboxMessage = {
      id: randomUUID(),
      teamId,
      toAgentId: toSlotId,
      fromAgentId: fromAgentId,
      type: 'message',
      content,
      files: options?.files,
      read: false,
      createdAt: Date.now(),
    };

    this.eventBus.emit('team:message_sent', { teamId, from: fromAgentId, to: toSlotId, content });
  }

  async startSession(teamId: string, runtime: AgentRuntime): Promise<void> {
    const team = this.teams.get(teamId);
    if (!team) throw new Error('Team not found');

    if (this.sessions.has(teamId)) {
      return;
    }

    const mcpServer = new TeamMcpServer(teamId, team, this.eventBus);
    await mcpServer.start();

    this.sessions.set(teamId, {
      mcpServer,
      startedAt: Date.now(),
    });

    this.eventBus.emit('team:session_started', { teamId });
  }

  async stopSession(teamId: string): Promise<void> {
    const session = this.sessions.get(teamId);
    if (!session) return;

    await session.mcpServer.stop();
    this.sessions.delete(teamId);

    this.eventBus.emit('team:session_stopped', { teamId });
  }

  async updateWorkspace(teamId: string, workspace: string): Promise<void> {
    const team = this.teams.get(teamId);
    if (!team) throw new Error('Team not found');

    team.workspace = workspace;
    team.updatedAt = Date.now();
    this.teams.set(teamId, team);

    this.eventBus.emit('team:workspace_updated', { teamId, workspace });
  }

  getTeam(teamId: string): TTeam | undefined {
    return this.teams.get(teamId);
  }

  listTeams(userId: string): TTeam[] {
    return Array.from(this.teams.values()).filter(t => t.userId === userId);
  }

  async deleteTeam(teamId: string): Promise<void> {
    await this.stopSession(teamId);
    this.teams.delete(teamId);
    this.eventBus.emit('team:deleted', { teamId });
  }

  private async acquireMutex(key: string): Promise<void> {
    while (this.mutexes.has(key)) {
      await this.mutexes.get(key);
    }
    let release: () => void;
    const promise = new Promise<void>(resolve => { release = resolve; });
    this.mutexes.set(key, promise);
  }

  private releaseMutex(key: string): void {
    const promise = this.mutexes.get(key);
    this.mutexes.delete(key);
    promise?.then(() => {});
  }

  private normalize(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[\u00A0\u200B]/g, '')
      .replace(/['']/g, '');
  }
}

interface MailboxMessage {
  id: string;
  teamId: string;
  toAgentId: string;
  fromAgentId: string;
  type: 'message' | 'idle_notification' | 'shutdown_request';
  content: string;
  files?: string[];
  read: boolean;
  createdAt: number;
}

class TeamMcpServer {
  private port?: number;
  private server?: import('net').Server;
  private authToken: string;

  constructor(
    private teamId: string,
    private team: TTeam,
    private eventBus: TeamEventBus
  ) {
    this.authToken = randomUUID();
  }

  async start(): Promise<void> {
    this.server = (await import('net')).createServer();
    this.port = 0;

    return new Promise((resolve, reject) => {
      this.server!.listen(0, () => {
        const address = this.server!.address();
        this.port = typeof address === 'object' && address ? address.port : 0;
        resolve();
      });
      this.server!.on('error', reject);
    });
  }

  async stop(): Promise<void> {
    return new Promise(resolve => {
      this.server?.close(() => resolve());
    });
  }

  getPort(): number | undefined {
    return this.port;
  }

  getAuthToken(): string {
    return this.authToken;
  }
}