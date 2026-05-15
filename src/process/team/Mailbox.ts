import { randomUUID } from 'crypto';
import type { MailboxMessage } from '../../common/types/teamTypes.js';

export interface IMailbox {
  write(message: Omit<MailboxMessage, 'id' | 'createdAt' | 'read'>): MailboxMessage;
  readUnread(agentId: string): MailboxMessage[];
  readUnreadAndMark(agentId: string): MailboxMessage[];
  markRead(messageId: string): void;
  markAllRead(agentId: string): void;
  getAll(teamId: string): MailboxMessage[];
}

export class Mailbox implements IMailbox {
  private readonly messages: MailboxMessage[] = [];

  write(message: Omit<MailboxMessage, 'id' | 'createdAt' | 'read'>): MailboxMessage {
    const msg: MailboxMessage = {
      ...message,
      id: randomUUID(),
      read: false,
      createdAt: Date.now(),
    };
    this.messages.push(msg);
    return msg;
  }

  readUnread(agentId: string): MailboxMessage[] {
    return this.messages.filter(m => m.toAgentId === agentId && !m.read);
  }

  readUnreadAndMark(agentId: string): MailboxMessage[] {
    const unread = this.readUnread(agentId);
    for (const msg of unread) {
      msg.read = true;
    }
    return unread;
  }

  markRead(messageId: string): void {
    const msg = this.messages.find(m => m.id === messageId);
    if (msg) {
      msg.read = true;
    }
  }

  markAllRead(agentId: string): void {
    for (const msg of this.messages) {
      if (msg.toAgentId === agentId) {
        msg.read = true;
      }
    }
  }

  getAll(teamId: string): MailboxMessage[] {
    return this.messages.filter(m => m.teamId === teamId);
  }

  clear(teamId: string): void {
    const ids = this.messages.filter(m => m.teamId === teamId).map(m => m.id);
    for (const id of ids) {
      const idx = this.messages.findIndex(m => m.id === id);
      if (idx !== -1) this.messages.splice(idx, 1);
    }
  }
}