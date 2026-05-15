import { EventEmitter } from 'events';
import { EventDeduplicator } from './EventDeduplicator';

export interface ToolContinuation {
  callId: string;
  sessionKey: string;
  startedAt: Date;
  waitingForResponse: boolean;
}

export class ActionExecutor extends EventEmitter {
  private toolContinuations: Map<string, ToolContinuation> = new Map();
  private deduplicator: EventDeduplicator;
  private readonly TOOL_WAIT_MS = 15 * 1000;
  private readonly STREAM_NON_ANSWER_THRESHOLD = 3;
  private readonly THROTTLE_MS = 500;
  private lastStreamTime: Map<string, number> = new Map();
  private yoloMode: boolean;

  constructor(deduplicator: EventDeduplicator, yoloMode: boolean = true) {
    super();
    this.deduplicator = deduplicator;
    this.yoloMode = yoloMode;
  }

  setYoloMode(enabled: boolean): void {
    this.yoloMode = enabled;
  }

  isYoloMode(): boolean {
    return this.yoloMode;
  }

  async handleMessage(
    platform: string,
    userId: string,
    chatId: string,
    messageId: string,
    content: string
  ): Promise<{ shouldProcess: boolean; duplicate: boolean }> {
    const duplicate = this.deduplicator.checkAndMark(platform, userId, chatId, messageId);
    if (duplicate) {
      return { shouldProcess: false, duplicate: true };
    }
    return { shouldProcess: true, duplicate: false };
  }

  startToolContinuation(callId: string, sessionKey: string): void {
    this.toolContinuations.set(callId, {
      callId,
      sessionKey,
      startedAt: new Date(),
      waitingForResponse: true,
    });
    this.emit('tool:continuation:started', { callId, sessionKey });
  }

  async waitForToolContinuation(callId: string): Promise<boolean> {
    const continuation = this.toolContinuations.get(callId);
    if (!continuation) return false;

    const elapsed = Date.now() - continuation.startedAt.getTime();
    if (elapsed > this.TOOL_WAIT_MS) {
      this.toolContinuations.delete(callId);
      this.emit('tool:continuation:timeout', { callId });
      return false;
    }
    return continuation.waitingForResponse;
  }

  resolveToolContinuation(callId: string): void {
    const continuation = this.toolContinuations.get(callId);
    if (continuation) {
      continuation.waitingForResponse = false;
      this.toolContinuations.delete(callId);
      this.emit('tool:continuation:resolved', { callId });
    }
  }

  shouldContinueStream(nonAnswerCount: number, streamMessages: number): boolean {
    if (nonAnswerCount >= this.STREAM_NON_ANSWER_THRESHOLD && streamMessages < 5) {
      return true;
    }
    return false;
  }

  throttleStream(sessionKey: string): boolean {
    const now = Date.now();
    const lastTime = this.lastStreamTime.get(sessionKey) || 0;
    if (now - lastTime < this.THROTTLE_MS) {
      return false;
    }
    this.lastStreamTime.set(sessionKey, now);
    return true;
  }

  checkToolContinuationTimeout(): string[] {
    const now = Date.now();
    const timedOut: string[] = [];
    for (const [callId, continuation] of this.toolContinuations.entries()) {
      if (now - continuation.startedAt.getTime() > this.TOOL_WAIT_MS) {
        timedOut.push(callId);
        this.toolContinuations.delete(callId);
      }
    }
    return timedOut;
  }

  getActiveContinuations(): ToolContinuation[] {
    return Array.from(this.toolContinuations.values());
  }

  destroy(): void {
    this.toolContinuations.clear();
    this.lastStreamTime.clear();
  }
}