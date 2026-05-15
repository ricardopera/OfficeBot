import { ISqliteDriver, Result } from './ISqliteDriver'

export interface Team {
  id: string
  user_id: string
  name: string
  workspace: string | null
  workspace_mode: string
  lead_agent_id: string | null
  agents: string
  created_at: number
  updated_at: number
}

export interface MailboxMessage {
  id: string
  team_id: string
  from_agent_id: string
  to_agent_id: string
  content: string
  read: number
  created_at: number
}

export interface TeamTask {
  id: string
  team_id: string
  title: string
  status: string
  owner: string | null
  blocked_by: string | null
  created_at: number
  updated_at: number
}

export class TeamRepository {
  constructor(private db: ISqliteDriver) {}

  createTeam(team: Omit<Team, 'created_at' | 'updated_at'>): Result {
    const now = Date.now()
    return this.db.run(
      `INSERT INTO teams (id, user_id, name, workspace, workspace_mode, lead_agent_id, agents, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [team.id, team.user_id, team.name, team.workspace, team.workspace_mode || 'shared',
       team.lead_agent_id, team.agents || '[]', now, now])
  }

  findTeamById(id: string): Team | undefined {
    const rows = this.db.query<Team>('SELECT * FROM teams WHERE id = ?', [id])
    return rows[0]
  }

  findTeamsByUserId(userId: string): Team[] {
    return this.db.query<Team>('SELECT * FROM teams WHERE user_id = ?', [userId])
  }

  updateTeam(id: string, data: Partial<Team>): Result {
    const fields = ['updated_at = ?']
    const values: any[] = [Date.now()]
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
    if (data.agents !== undefined) { fields.push('agents = ?'); values.push(data.agents) }
    if (data.lead_agent_id !== undefined) { fields.push('lead_agent_id = ?'); values.push(data.lead_agent_id) }
    if (data.workspace !== undefined) { fields.push('workspace = ?'); values.push(data.workspace) }
    if (data.workspace_mode !== undefined) { fields.push('workspace_mode = ?'); values.push(data.workspace_mode) }
    values.push(id)
    return this.db.run(`UPDATE teams SET ${fields.join(', ')} WHERE id = ?`, values)
  }

  deleteTeam(id: string): Result {
    return this.db.run('DELETE FROM teams WHERE id = ?', [id])
  }

  addAgent(teamId: string, agent: { id: string; role: string }): Result {
    const team = this.findTeamById(teamId)
    if (!team) return { changes: 0, lastInsertRowid: 0 }
    const agents = JSON.parse(team.agents || '[]')
    agents.push(agent)
    return this.updateTeam(teamId, { agents: JSON.stringify(agents) })
  }

  removeAgent(teamId: string, agentId: string): Result {
    const team = this.findTeamById(teamId)
    if (!team) return { changes: 0, lastInsertRowid: 0 }
    const agents = JSON.parse(team.agents || '[]').filter((a: any) => a.id !== agentId)
    return this.updateTeam(teamId, { agents: JSON.stringify(agents) })
  }

  sendMessage(message: Omit<MailboxMessage, 'created_at'>): Result {
    return this.db.run(
      `INSERT INTO mailbox (id, team_id, from_agent_id, to_agent_id, content, read, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [message.id, message.team_id, message.from_agent_id, message.to_agent_id, message.content, Date.now()])
  }

  getMessages(teamId: string, agentId: string): MailboxMessage[] {
    return this.db.query<MailboxMessage>(
      `SELECT * FROM mailbox WHERE team_id = ? AND to_agent_id = ? AND read = 0 ORDER BY created_at ASC`,
      [teamId, agentId])
  }

  markMessagesRead(messageIds: string[]): Result {
    if (messageIds.length === 0) return { changes: 0, lastInsertRowid: 0 }
    const placeholders = messageIds.map(() => '?').join(',')
    return this.db.run(
      `UPDATE mailbox SET read = 1 WHERE id IN (${placeholders})`,
      messageIds)
  }

  createTask(task: Omit<TeamTask, 'created_at' | 'updated_at'>): Result {
    const now = Date.now()
    return this.db.run(
      `INSERT INTO team_tasks (id, team_id, title, status, owner, blocked_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [task.id, task.team_id, task.title, task.status || 'pending', task.owner, task.blocked_by, now, now])
  }

  findTasksByTeamId(teamId: string): TeamTask[] {
    return this.db.query<TeamTask>('SELECT * FROM team_tasks WHERE team_id = ?', [teamId])
  }

  updateTaskStatus(id: string, status: string): Result {
    return this.db.run(
      'UPDATE team_tasks SET status = ?, updated_at = ? WHERE id = ?',
      [status, Date.now(), id])
  }
}