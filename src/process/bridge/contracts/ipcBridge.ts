import { EventEmitter } from 'events';

export interface IpcPayload {
  type: string;
  channel: string;
  data: unknown;
  timestamp?: number;
}

export interface BridgeHandler {
  channel: string;
  handle(payload: IpcPayload): Promise<unknown>;
}

export interface ITransport {
  send(channel: string, data: unknown): void;
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler: (...args: unknown[]) => void): void;
  disconnect(): void;
}

export type ProviderHandler = (data: unknown) => Promise<unknown>;
export type EmitterHandler = (data: unknown) => void;

export interface BridgeMetrics {
  messagesSent: number;
  messagesReceived: number;
  errors: number;
  droppedEvents: number;
}

const MAX_PAYLOAD_SIZE = 50 * 1024 * 1024;

export function validatePayloadSize(data: unknown): boolean {
  try {
    const size = JSON.stringify(data).length;
    return size <= MAX_PAYLOAD_SIZE;
  } catch {
    return false;
  }
}

export abstract class BaseBridge extends EventEmitter {
  protected handlers = new Map<string, BridgeHandler>();
  protected metrics: BridgeMetrics = { messagesSent: 0, messagesReceived: 0, errors: 0, droppedEvents: 0 };

  abstract connect(): void;
  abstract disconnect(): void;

  registerHandler(channel: string, handler: BridgeHandler): void {
    this.handlers.set(channel, handler);
  }

  protected async executeHandler(channel: string, payload: IpcPayload): Promise<unknown> {
    const handler = this.handlers.get(channel);
    if (!handler) {
      throw new Error(`No handler registered for channel: ${channel}`);
    }
    return handler.handle(payload);
  }

  getMetrics(): BridgeMetrics {
    return { ...this.metrics };
  }
}

export function createCodexRemap(type: string): { type: string; extra?: Record<string, unknown> } {
  if (type === 'codex') {
    return { type: 'acp', extra: { backend: 'codex' } };
  }
  return { type };
}