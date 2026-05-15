import { randomUUID } from 'crypto';
import { inject, injectable } from 'tsyringe';
import type { TTeam, TeamAgent, TeammateStatus, MailboxMessage } from '../../common/types/teamTypes.js';
import { TeamEventBus } from './teamEventBus.js';

export const WAKE_TIMEOUT_MS = 60000;
export const INACTIVITY_TIMEOUT_MS = 60000;

export type IdleReason = 'available' | 'interrupted' | 'failed';

export interface IdleNotification {
  type: 'idle_notification';
  idleReason: IdleReason;
  summary: string;
  completedTaskId?: string;
  failureReason?: string;
}

@injectable()
export class TeammateManager {
  private readonly activeWakes = new Set<string>();
  private readonly agentStates = new Map<string, TeammateStatus>();
  private readonly inactivityTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    @inject(TeamEventBus) private readonly eventBus: TeamEventBus
  ) {}

  async spawnAgent(teamId: string, team: TTeam, agentConfig: Partial<TeamAgent>): Promise<TeamAgent> {
    const agentId = `slot-${randomUUID().slice(0, 8)}`;
    const now = Date.now();

    const agent: TeamAgent = {
      slotId: agentId,
      conversationId: agentConfig.conversationId ?? randomUUID(),
      role: agentConfig.role ?? 'teammate',
      agentType: agentConfig.agentType ?? 'gemini',
      agentName: agentConfig.agentName ?? 'Unnamed Agent',
      conversationType: agentConfig.conversationType ?? 'acp',
      status: 'pending',
      cliPath: agentConfig.cliPath,
      customAgentId: agentConfig.customAgentId,
      model: agentConfig.model,
      createdAt: now,
      updatedAt: now,
    };

    team.agents.push(agent);
    this.agentStates.set(agentId, 'pending');
    this.eventBus.emit('team:agent_spawned', { teamId, agent });

    return agent;
  }

  async wake(teamId: string, agentId: string, mailbox: Mailbox, runtime?: { prompt: (msg: string) => Promise<void> }): Promise<void> {
    if (this.activeWakes.has(agentId)) return;
    this.activeWakes.add(agentId);

    try {
      this.updateStatus(teamId, agentId, 'active');
      this.resetInactivityTimer(teamId, agentId);

      const unread = mailbox.readUnread(agentId);
      for (const msg of unread) {
        if (runtime) {
          await runtime.prompt(msg.content);
        }
      }

      if (unread.length > 0) {
        mailbox.markAllRead(agentId);
      }
    } finally {
      this.activeWakes.delete(agentId);
    }
  }

  async handleAgentCrash(teamId: string, agentId: string, error: Error): Promise<void> {
    this.updateStatus(teamId, agentId, 'failed');
    this.clearInactivityTimer(agentId);

    const testament: MailboxMessage = {
      id: randomUUID(),
      teamId,
      toAgentId: this.getLeaderSlotId(teamId),
      fromAgentId: agentId,
      type: 'idle_notification',
      content: JSON.stringify({
        type: 'idle_notification',
        idleReason: 'failed',
        failureReason: error.message,
      }),
      read: false,
      createdAt: Date.now(),
    };

    this.eventBus.emit('team:agent_crashed', { teamId, agentId, error: error.message });
  }

  handleInactivityTimeout(teamId: string, agentId: string): void {
    const status = this.agentStates.get(agentId);
    if (status === 'active') {
      this.updateStatus(teamId, agentId, 'failed');
      this.notifyLeader(teamId, agentId, 'failed');
    }
  }

  handleRateLimitError(teamId: string, agentId: string): void {
    this.updateStatus(teamId, agentId, 'failed');
    this.notifyLeader(teamId, agentId, 'failed');
  }

  async removeAgent(teamId: string, slotId: string, team: TTeam): Promise<void> {
    const agent = team.agents.find(a => a.slotId === slotId);
    if (!agent) throw new Error('Agent not found');

    if (agent.role === 'leader') {
      throw new Error('Leader cannot be removed from the team');
    }

    team.agents = team.agents.filter(a => a.slotId !== slotId);
    this.agentStates.delete(slotId);
    this.clearInactivityTimer(slotId);

    this.eventBus.emit('team:agent_removed', { teamId, slotId });
  }

  async renameAgent(team: TTeam, slotId: string, newName: string): Promise<string> {
    const agent = team.agents.find(a => a.slotId === slotId);
    if (!agent) throw new Error('Agent not found');

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

    return formerName;
  }

  private updateStatus(teamId: string, agentId: string, status: TeammateStatus): void {
    this.agentStates.set(agentId, status);
    this.eventBus.emit('team:agent_status_changed', { teamId, slotId: agentId, status });
  }

  private resetInactivityTimer(teamId: string, agentId: string): void {
    this.clearInactivityTimer(agentId);
    const timer = setTimeout(() => {
      this.handleInactivityTimeout(teamId, agentId);
    }, INACTIVITY_TIMEOUT_MS);
    this.inactivityTimers.set(agentId, timer);
  }

  private clearInactivityTimer(agentId: string): void {
    const timer = this.inactivityTimers.get(agentId);
    if (timer) {
      clearTimeout(timer);
      this.inactivityTimers.delete(agentId);
    }
  }

  private notifyLeader(teamId: string, agentId: string, idleReason: IdleReason): void {
    const team = this.getTeam(teamId);
    if (!team) return;

    const leader = team.agents.find(a => a.role === 'leader');
    if (!leader) return;

    const notification: IdleNotification = {
      type: 'idle_notification',
      idleReason,
      summary: `Agent ${agentId} is now ${idleReason}`,
    };

    this.eventBus.emit('team:agent_idle', {
      teamId,
      slotId: agentId,
      leaderSlotId: leader.slotId,
      notification,
    });
  }

  private getLeaderSlotId(teamId: string): string {
    return '';
  }

  private getTeam(teamId: string): TTeam | undefined {
    return undefined;
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