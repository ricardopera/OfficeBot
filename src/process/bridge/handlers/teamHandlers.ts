import { IpcPayload } from '../contracts/ipcBridge';

export interface TeamCreateInput {
  name: string;
  leaderId?: string;
  mode?: 'shared' | 'isolated';
}

export interface TeamMemberInput {
  teamId: string;
  agentId: string;
  role?: string;
}

export interface TaskInput {
  teamId: string;
  title: string;
  description?: string;
  assignedTo?: string;
  priority?: 'low' | 'medium' | 'high';
}

export const TEAM_CAPABLE_BACKENDS = ['gemini', 'claude', 'codex', 'aionrs'];

export async function handleTeamCreate(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as TeamCreateInput;
  return {
    success: true,
    teamId: `team_${Date.now()}`,
    name: data.name,
    mode: data.mode || 'shared',
    createdAt: new Date().toISOString(),
  };
}

export async function handleTeamList(payload: IpcPayload): Promise<unknown> {
  return { teams: [], total: 0 };
}

export async function handleTeamGet(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { teamId: string };
  return { teamId: data.teamId, members: [], tasks: [] };
}

export async function handleTeamDelete(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { teamId: string };
  return { success: true, deletedId: data.teamId };
}

export async function handleTeamAddMember(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as TeamMemberInput;
  const isLeader = TEAM_CAPABLE_BACKENDS.includes(data.agentId);
  return {
    success: true,
    teamId: data.teamId,
    memberId: data.agentId,
    role: isLeader ? 'leader' : 'member',
    canBeRemoved: !isLeader,
  };
}

export async function handleTeamRemoveMember(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as TeamMemberInput;
  return { success: true, teamId: data.teamId, removedId: data.agentId };
}

export async function handleTeamUpdateMember(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as TeamMemberInput & { role: string };
  return { success: true, teamId: data.teamId, memberId: data.agentId, role: data.role };
}

export async function handleTeamSetLeader(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { teamId: string; agentId: string };
  return { success: true, teamId: data.teamId, leaderId: data.agentId };
}

export async function handleTeamSpawn(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { teamId: string; agentId: string; config?: unknown };
  return {
    success: true,
    sessionId: `session_team_${Date.now()}`,
    teamId: data.teamId,
    agentId: data.agentId,
  };
}

export async function handleTeamMessage(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { teamId: string; message: string; to?: string };
  return { success: true, messageId: `msg_team_${Date.now()}`, teamId: data.teamId };
}

export async function handleTeamTaskCreate(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as TaskInput;
  return {
    success: true,
    taskId: `task_${Date.now()}`,
    teamId: data.teamId,
    title: data.title,
    status: 'pending',
  };
}

export async function handleTeamTaskList(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { teamId: string; status?: string };
  return { tasks: [], teamId: data.teamId };
}

export async function handleTeamTaskUpdate(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { taskId: string; status?: string; assignedTo?: string };
  return { success: true, taskId: data.taskId };
}

export async function handleTeamTaskComplete(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { taskId: string };
  return { success: true, taskId: data.taskId, completed: true };
}

export async function handleTeamTaskFail(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { taskId: string; reason?: string };
  return { success: true, taskId: data.taskId, failed: true, reason: data.reason };
}

export async function handleTeamMailbox(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { teamId: string; agentId?: string };
  return { mailbox: [], teamId: data.teamId };
}

export async function handleTeamSync(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { teamId: string };
  return { success: true, synced: true, teamId: data.teamId };
}

export const teamHandlers = {
  'team:create': handleTeamCreate,
  'team:list': handleTeamList,
  'team:get': handleTeamGet,
  'team:delete': handleTeamDelete,
  'team:add:member': handleTeamAddMember,
  'team:remove:member': handleTeamRemoveMember,
  'team:update:member': handleTeamUpdateMember,
  'team:set:leader': handleTeamSetLeader,
  'team:spawn': handleTeamSpawn,
  'team:message': handleTeamMessage,
  'team:task:create': handleTeamTaskCreate,
  'team:task:list': handleTeamTaskList,
  'team:task:update': handleTeamTaskUpdate,
  'team:task:complete': handleTeamTaskComplete,
  'team:task:fail': handleTeamTaskFail,
  'team:mailbox': handleTeamMailbox,
  'team:sync': handleTeamSync,
};