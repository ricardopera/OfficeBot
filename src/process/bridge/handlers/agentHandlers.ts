import { IpcPayload, createCodexRemap } from '../contracts/ipcBridge';

export interface AgentConfigInput {
  backend?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AgentStartInput {
  conversationId: string;
  config?: AgentConfigInput;
}

export async function handleAgentList(payload: IpcPayload): Promise<unknown> {
  return {
    agents: [
      { id: 'gemini', name: 'Gemini', backend: 'gemini', available: true },
      { id: 'aionrs', name: 'AionRS', backend: 'aionrs', available: true },
      { id: 'codex', name: 'Codex', backend: 'codex', available: true },
    ],
    total: 3,
  };
}

export async function handleAgentGet(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { agentId: string };
  return { agentId: data.agentId, status: 'idle' };
}

export async function handleAgentStart(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as AgentStartInput;
  return {
    success: true,
    sessionId: `session_${Date.now()}`,
    conversationId: data.conversationId,
    warmup: true,
    warmupDurationMs: 7000,
  };
}

export async function handleAgentStop(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { sessionId: string };
  return { success: true, sessionId: data.sessionId, stopped: true };
}

export async function handleAgentPause(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { sessionId: string };
  return { success: true, sessionId: data.sessionId, paused: true };
}

export async function handleAgentResume(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { sessionId: string };
  return { success: true, sessionId: data.sessionId, resumed: true };
}

export async function handleAgentConfig(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as AgentConfigInput;
  const remapped = createCodexRemap(data.backend || 'codex');
  return {
    success: true,
    backend: remapped.type,
    extra: remapped.extra,
    config: data,
  };
}

export async function handleAgentStatus(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { sessionId?: string; conversationId?: string };
  return {
    sessionId: data.sessionId,
    conversationId: data.conversationId,
    status: 'idle',
    uptime: 0,
  };
}

export async function handleAgentStats(payload: IpcPayload): Promise<unknown> {
  return {
    totalSessions: 0,
    activeSessions: 0,
    totalTokens: 0,
    totalCost: 0,
  };
}

export async function handleAgentLogs(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { sessionId: string; limit?: number };
  return { logs: [], sessionId: data.sessionId };
}

export async function handleAgentKill(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { sessionId: string; reason?: string };
  return { success: true, sessionId: data.sessionId, killed: true, reason: data.reason };
}

export async function handleAgentRebuild(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { sessionId: string; reason?: string };
  return { success: true, sessionId: data.sessionId, rebuilt: true, reason: data.reason };
}

export async function handleAgentDetection(payload: IpcPayload): Promise<unknown> {
  return {
    detected: [
      { id: 'gemini', backend: 'gemini', cli: 'gemini', available: true },
      { id: 'aionrs', backend: 'aionrs', cli: 'aionrs', available: true },
    ],
    timestamp: Date.now(),
  };
}

export async function handleAgentWarmupCheck(payload: IpcPayload): Promise<unknown> {
  return { warmup: true, estimatedSavingsMs: 7000, ready: true };
}

export const agentHandlers = {
  'agent:list': handleAgentList,
  'agent:get': handleAgentGet,
  'agent:start': handleAgentStart,
  'agent:stop': handleAgentStop,
  'agent:pause': handleAgentPause,
  'agent:resume': handleAgentResume,
  'agent:config': handleAgentConfig,
  'agent:status': handleAgentStatus,
  'agent:stats': handleAgentStats,
  'agent:logs': handleAgentLogs,
  'agent:kill': handleAgentKill,
  'agent:rebuild': handleAgentRebuild,
  'agent:detection': handleAgentDetection,
  'agent:warmup:check': handleAgentWarmupCheck,
};