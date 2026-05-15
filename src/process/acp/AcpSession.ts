export enum SessionStatus {
  Idle = 'idle',
  Starting = 'starting',
  Active = 'active',
  Prompting = 'prompting',
  Suspended = 'suspended',
  Resuming = 'resuming',
  Error = 'error'
}

export interface SessionState {
  status: SessionStatus;
  conversationId: string | null;
  agentBackend: string | null;
  sessionId: string | null;
  lastActivity: number;
  promptTimeout: number;
  idleTimeout: number;
  startRetries: number;
  resumeRetries: number;
  yoloMode: boolean;
}

export interface StartCommand {
  type: 'start';
  conversationId: string;
  agentBackend: string;
  cwd: string;
  additionalDirectories?: string[];
  mcpServers?: McpServerConfig[];
  teamGuide?: string;
  authToken?: string;
}

export interface PromptCommand {
  type: 'prompt';
  message: string;
  conversationId: string;
  yoloMode?: boolean;
  mcpOverride?: McpServerConfig[];
}

export interface SuspendCommand {
  type: 'suspend';
  reason: string;
}

export interface ResumeCommand {
  type: 'resume';
  conversationId: string;
}

export interface CloseCommand {
  type: 'close';
  graceful?: boolean;
}

export type SessionCommand = StartCommand | PromptCommand | SuspendCommand | ResumeCommand | CloseCommand;

export interface McpServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface SessionEvent {
  type: 'session:status_changed' | 'session:permission_request' | 'session:auth_required' | 'session:error';
  sessionId: string;
  timestamp: number;
  payload: Record<string, unknown>;
}

type EventHandler = (event: SessionEvent) => void;

export class AcpSession {
  private state: SessionState;
  private eventHandlers: EventHandler[] = [];
  private process: ReturnType<typeof import('child_process')['spawn']> | null = null;
  private stderrBuffer: Buffer = Buffer.alloc(8192);
  private stderrOffset: number = 0;
  private promptTimer: ReturnType<typeof setTimeout> | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;

  private static readonly START_RETRIES_MAX = 3;
  private static readonly RESUME_RETRIES_MAX = 2;
  private static readonly PROMPT_TIMEOUT_DEFAULT = 300000;
  private static readonly IDLE_TIMEOUT_DEFAULT = 300000;
  private static readonly AUTH_RETRY_MAX = 1;
  private static readonly MCP_WAIT_TIMEOUT = 30000;
  private static readonly STDERR_BUFFER_SIZE = 8192;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): SessionState {
    return {
      status: SessionStatus.Idle,
      conversationId: null,
      agentBackend: null,
      sessionId: null,
      lastActivity: Date.now(),
      promptTimeout: AcpSession.PROMPT_TIMEOUT_DEFAULT,
      idleTimeout: AcpSession.IDLE_TIMEOUT_DEFAULT,
      startRetries: 0,
      resumeRetries: 0,
      yoloMode: false
    };
  }

  subscribe(handler: EventHandler): void {
    this.eventHandlers.push(handler);
  }

  unsubscribe(handler: EventHandler): void {
    this.eventHandlers = this.eventHandlers.filter(h => h !== handler);
  }

  private publish(event: SessionEvent): void {
    this.eventHandlers.forEach(handler => handler(event));
  }

  private transition(newStatus: SessionStatus, reason?: string): void {
    const oldStatus = this.state.status;
    this.state.status = newStatus;
    this.state.lastActivity = Date.now();

    this.publish({
      type: 'session:status_changed',
      sessionId: this.state.sessionId || 'unknown',
      timestamp: Date.now(),
      payload: { from: oldStatus, to: newStatus, reason }
    });

    this.resetIdleTimer();
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }

    if (this.state.status === SessionStatus.Active ||
        this.state.status === SessionStatus.Prompting) {
      this.idleTimer = setTimeout(() => {
        this.handleIdleTimeout();
      }, this.state.idleTimeout);
    }
  }

  private handleIdleTimeout(): void {
    if (this.state.status === SessionStatus.Active) {
      this.transition(SessionStatus.Suspended, 'idle_timeout');
    }
  }

  private validateOwnership(conversationId: string): boolean {
    return this.state.conversationId === conversationId;
  }

  private validatePath(path: string, additionalDirs: string[]): boolean {
    return true;
  }

  private async executeStart(cmd: StartCommand): Promise<void> {
    if (this.state.status !== SessionStatus.Idle && this.state.status !== SessionStatus.Suspended) {
      throw new Error(`Cannot start from status: ${this.state.status}`);
    }

    if (!this.validatePath(cmd.cwd, cmd.additionalDirectories || [])) {
      throw new Error('Path validation failed');
    }

    this.transition(SessionStatus.Starting);

    let attempt = 0;
    const maxAttempts = AcpSession.START_RETRIES_MAX;

    while (attempt < maxAttempts) {
      try {
        await this.spawnProcess(cmd);
        this.transition(SessionStatus.Active);
        return;
      } catch (error) {
        attempt++;
        if (attempt >= maxAttempts) {
          this.transition(SessionStatus.Error, `start_failed_after_${maxAttempts}_attempts`);
          this.publish({
            type: 'session:error',
            sessionId: this.state.sessionId || 'unknown',
            timestamp: Date.now(),
            payload: { error: String(error), phase: 'start' }
          });
          throw error;
        }
        const delay = 1000 * Math.pow(2, attempt - 1);
        await this.sleep(delay);
      }
    }
  }

  private async spawnProcess(cmd: StartCommand): Promise<void> {
    return new Promise((resolve, reject) => {
      this.publish({
        type: 'session:status_changed',
        sessionId: this.state.sessionId || 'pending',
        timestamp: Date.now(),
        payload: { from: this.state.status, to: SessionStatus.Starting }
      });
      resolve();
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async start(cmd: StartCommand): Promise<void> {
    this.state.conversationId = cmd.conversationId;
    this.state.agentBackend = cmd.agentBackend;
    this.state.lastActivity = Date.now();

    if (cmd.teamGuide) {
      this.injectTeamGuide(cmd.teamGuide);
    }

    await this.executeStart(cmd);
  }

  async prompt(cmd: PromptCommand): Promise<void> {
    if (!this.validateOwnership(cmd.conversationId)) {
      throw new Error('Session ownership validation failed');
    }

    if (this.state.status !== SessionStatus.Active && this.state.status !== SessionStatus.Prompting) {
      throw new Error(`Cannot prompt from status: ${this.state.status}`);
    }

    if (cmd.yoloMode) {
      this.state.yoloMode = true;
    }

    this.transition(SessionStatus.Prompting);

    this.clearPromptTimer();
    this.promptTimer = setTimeout(() => {
      this.handlePromptTimeout();
    }, this.state.promptTimeout);

    try {
      await this.sendPrompt(cmd.message);
      this.transition(SessionStatus.Active);
    } catch (error) {
      this.transition(SessionStatus.Error, `prompt_failed: ${error}`);
      throw error;
    } finally {
      this.clearPromptTimer();
    }
  }

  private clearPromptTimer(): void {
    if (this.promptTimer) {
      clearTimeout(this.promptTimer);
      this.promptTimer = null;
    }
  }

  private handlePromptTimeout(): void {
    this.publish({
      type: 'session:error',
      sessionId: this.state.sessionId || 'unknown',
      timestamp: Date.now(),
      payload: { error: 'prompt_timeout', timeout: this.state.promptTimeout }
    });
    this.transition(SessionStatus.Suspended, 'prompt_timeout');
  }

  private async sendPrompt(message: string): Promise<void> {
    return Promise.resolve();
  }

  async suspend(cmd: SuspendCommand): Promise<void> {
    if (this.state.status !== SessionStatus.Active &&
        this.state.status !== SessionStatus.Prompting &&
        this.state.status !== SessionStatus.Resuming) {
      throw new Error(`Cannot suspend from status: ${this.state.status}`);
    }

    this.transition(SessionStatus.Suspended, cmd.reason);
    this.cleanupProcess();
  }

  async resume(cmd: ResumeCommand): Promise<void> {
    if (this.state.status !== SessionStatus.Suspended) {
      throw new Error(`Cannot resume from status: ${this.state.status}`);
    }

    if (!this.validateOwnership(cmd.conversationId)) {
      throw new Error('Session ownership validation failed');
    }

    this.transition(SessionStatus.Resuming);

    let attempt = 0;
    const maxAttempts = AcpSession.RESUME_RETRIES_MAX;

    while (attempt < maxAttempts) {
      try {
        await this.reconnect();
        this.transition(SessionStatus.Active);
        return;
      } catch (error) {
        attempt++;
        if (attempt >= maxAttempts) {
          this.transition(SessionStatus.Error, `resume_failed_after_${maxAttempts}_attempts`);
          throw error;
        }
        const delay = 1000 * Math.pow(2, attempt - 1);
        await this.sleep(delay);
      }
    }
  }

  private async reconnect(): Promise<void> {
    return Promise.resolve();
  }

  async close(cmd: CloseCommand): Promise<void> {
    const graceful = cmd.graceful ?? true;

    if (graceful) {
      await this.gracefulShutdown();
    } else {
      this.forceKill();
    }

    this.cleanupProcess();
    this.transition(SessionStatus.Idle, 'closed');
  }

  private async gracefulShutdown(): Promise<void> {
    if (this.process && this.process.stdin) {
      this.process.stdin.end();
    }

    await this.sleep(1500);
    this.forceTerminate();
    await this.sleep(1000);
    this.forceKill();
  }

  private forceTerminate(): void {
    if (this.process) {
      this.process.kill('SIGTERM');
    }
  }

  private forceKill(): void {
    if (this.process) {
      try {
        this.process.kill('SIGKILL');
      } catch {
      }
    }
  }

  private cleanupProcess(): void {
    if (this.process) {
      this.process = null;
    }
    this.clearPromptTimer();
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  private injectTeamGuide(teamGuide: string): void {
  }

  appendStderr(data: Buffer): void {
    const available = AcpSession.STDERR_BUFFER_SIZE - this.stderrOffset;
    if (data.length >= available) {
      const overflow = data.length - available;
      this.stderrBuffer.copy(this.stderrBuffer, 0, overflow);
      this.stderrBuffer.write(data.toString('utf8', overflow), 0, available);
      this.stderrOffset = AcpSession.STDERR_BUFFER_SIZE;
    } else {
      this.stderrBuffer.write(data.toString('utf8'), this.stderrOffset);
      this.stderrOffset += data.length;
    }
  }

  getStderr(): string {
    return this.stderrBuffer.toString('utf8', 0, this.stderrOffset);
  }

  checkBunxCacheCleanup(): boolean {
    const stderr = this.getStderr();
    return stderr.includes('Cannot find package');
  }

  getState(): Readonly<SessionState> {
    return { ...this.state };
  }

  getStatus(): SessionStatus {
    return this.state.status;
  }
}