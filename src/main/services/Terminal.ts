import type { BrowserWindow } from 'electron';
import type { TerminalSession } from '@shared/types';
import { IPC } from '@shared/ipc-channels';
import { platform } from 'os';

export class TerminalService {
  private sessions = new Map<string, { pty: unknown; session: TerminalSession }>();
  private window: BrowserWindow | null;

  constructor(window: BrowserWindow | null) {
    this.window = window;
  }

  setWindow(window: BrowserWindow): void {
    this.window = window;
  }

  async create(workspacePath?: string): Promise<TerminalSession> {
    const id = `terminal_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const session: TerminalSession = {
      id,
      title: 'Terminal',
      shell: this.getDefaultShell(),
      createdAt: Date.now(),
    };

    try {
      const pty = await import('node-pty');
      const ptyProcess = pty.spawn(session.shell, [], {
        name: 'xterm-256color',
        cols: 80,
        rows: 30,
        cwd: workspacePath ?? process.env.HOME ?? '/',
        env: process.env as Record<string, string>,
      });

      session.pid = ptyProcess.pid;

      ptyProcess.onData((data: string) => {
        this.window?.webContents.send(IPC.TERMINAL_OUTPUT, { id, data });
      });

      this.sessions.set(id, { pty: ptyProcess, session });
    } catch (err) {
      console.warn('node-pty not available, terminal disabled:', err);
    }

    return session;
  }

  write(id: string, data: string): void {
    const session = this.sessions.get(id);
    if (session) {
      (session.pty as { write(d: string): void }).write(data);
    }
  }

  resize(id: string, cols: number, rows: number): void {
    const session = this.sessions.get(id);
    if (session) {
      (session.pty as { resize(c: number, r: number): void }).resize(cols, rows);
    }
  }

  close(id: string): void {
    const session = this.sessions.get(id);
    if (session) {
      (session.pty as { kill(): void }).kill();
      this.sessions.delete(id);
    }
  }

  list(): TerminalSession[] {
    return Array.from(this.sessions.values()).map((s) => s.session);
  }

  private getDefaultShell(): string {
    if (platform() === 'win32') {
      return process.env.COMSPEC ?? 'cmd.exe';
    }
    return process.env.SHELL ?? '/bin/bash';
  }
}
