import { randomUUID } from 'crypto';
import type { TeamTask } from '../../common/types/teamTypes.js';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'deleted';

export interface ITaskManager {
  create(task: Omit<Omit<TeamTask, 'id' | 'createdAt' | 'updatedAt'>, 'status'>): TeamTask;
  update(taskId: string, updates: Partial<Pick<TeamTask, 'status' | 'owner' | 'subject' | 'description'>>): TeamTask | null;
  get(taskId: string): TeamTask | undefined;
  getByTeam(teamId: string): TeamTask[];
  delete(taskId: string): void;
  checkUnblocks(taskId: string): void;
}

export class TaskManager implements ITaskManager {
  private readonly tasks = new Map<string, TeamTask>();

  create(task: Omit<Omit<TeamTask, 'id' | 'createdAt' | 'updatedAt'>, 'status'>): TeamTask {
    const now = Date.now();
    const newTask: TeamTask = {
      ...task,
      id: randomUUID(),
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.set(newTask.id, newTask);
    return newTask;
  }

  update(
    taskId: string,
    updates: Partial<Pick<TeamTask, 'status' | 'owner' | 'subject' | 'description'>>
  ): TeamTask | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    if (updates.status !== undefined) task.status = updates.status;
    if (updates.owner !== undefined) task.owner = updates.owner;
    if (updates.subject !== undefined) task.subject = updates.subject;
    if (updates.description !== undefined) task.description = updates.description;
    task.updatedAt = Date.now();

    if (updates.status === 'completed') {
      this.checkUnblocks(taskId);
    }

    return task;
  }

  get(taskId: string): TeamTask | undefined {
    return this.tasks.get(taskId);
  }

  getByTeam(teamId: string): TeamTask[] {
    return Array.from(this.tasks.values()).filter(t => t.teamId === teamId);
  }

  delete(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = 'deleted';
      task.updatedAt = Date.now();
    }
  }

  checkUnblocks(completedTaskId: string): void {
    const blockedTasks = Array.from(this.tasks.values()).filter(t =>
      t.blockedBy.includes(completedTaskId)
    );

    for (const task of blockedTasks) {
      const allBlockersComplete = task.blockedBy.every(blockerId => {
        const blocker = this.tasks.get(blockerId);
        return blocker && blocker.status === 'completed';
      });

      if (allBlockersComplete) {
        task.status = 'pending';
        task.updatedAt = Date.now();
      }
    }
  }
}