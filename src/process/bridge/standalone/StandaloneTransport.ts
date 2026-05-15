import { EventEmitter } from 'events';
import { BaseBridge, ITransport, IpcPayload, validatePayloadSize, BridgeHandler } from '../contracts/ipcBridge';

export class StandaloneTransport extends BaseBridge implements ITransport {
  private connected = false;
  private handlers = new Map<string, (data: unknown) => Promise<unknown>>();

  connect(): void {
    this.connected = true;
    this.emit('connected');
  }

  disconnect(): void {
    this.connected = false;
    this.handlers.clear();
    this.emit('disconnected');
  }

  send(channel: string, data: unknown): void {
    if (!validatePayloadSize(data)) {
      this.metrics.droppedEvents++;
      this.emit('bridge:error', { channel, error: 'Payload exceeds 50MB', code: 'PAYLOAD_TOO_LARGE' });
      return;
    }

    if (this.handlers.has(channel)) {
      this.metrics.messagesSent++;
      this.emit(channel, data);
    }
  }

  on(event: string, handler: (...args: unknown[]) => void): void {
    this.on(event, handler);
  }

  off(event: string, handler: (...args: unknown[]) => void): void {
    this.off(event, handler);
  }

  registerProvider(channel: string, handler: (data: unknown) => Promise<unknown>): void {
    this.handlers.set(channel, handler);
  }

  registerEmitter(channel: string, handler: EmitterHandler): void {
    this.on(channel, handler);
  }

  async invoke(channel: string, data: unknown): Promise<unknown> {
    const handler = this.handlers.get(channel);
    if (!handler) {
      throw new Error(`No handler registered for channel: ${channel}`);
    }
    return handler(data);
  }
}

type EmitterHandler = (data: unknown) => void;

export const standaloneTransport = new StandaloneTransport();