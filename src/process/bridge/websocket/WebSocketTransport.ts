import { EventEmitter } from 'events';
import { BaseBridge, ITransport, IpcPayload, validatePayloadSize, BridgeHandler, createCodexRemap } from '../contracts/ipcBridge';

interface WebSocketConfig {
  url: string;
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  authToken?: string;
}

const INITIAL_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 8000;
const AUTH_EXPIRED_CODE = 1008;

export class WebSocketTransport extends BaseBridge implements ITransport {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private shouldReconnect = true;
  private messageQueue: Array<{ channel: string; data: unknown }> = [];
  private authExpired = false;

  constructor(config: WebSocketConfig) {
    super();
    this.config = {
      reconnect: true,
      maxReconnectAttempts: 10,
      ...config,
    };
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.shouldReconnect = true;
    this.createConnection();
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.emit('disconnected');
  }

  send(channel: string, data: unknown): void {
    if (!validatePayloadSize(data)) {
      this.metrics.droppedEvents++;
      this.emit('bridge:error', { channel, error: 'Payload exceeds 50MB', code: 'PAYLOAD_TOO_LARGE' });
      return;
    }

    const remapped = createCodexRemap(channel);
    const payload: IpcPayload = {
      type: remapped.type,
      channel: channel,
      data,
      timestamp: Date.now(),
    };

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
      this.metrics.messagesSent++;
    } else {
      this.messageQueue.push({ channel, data });
    }
  }

  on(event: string, handler: (...args: unknown[]) => void): void {
    this.on(event, handler);
  }

  off(event: string, handler: (...args: unknown[]) => void): void {
    this.off(event, handler);
  }

  private createConnection(): void {
    try {
      this.ws = new WebSocket(this.config.url, this.config.authToken ? [this.config.authToken] : undefined);
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
    } catch (error) {
      this.metrics.errors++;
      this.scheduleReconnect();
    }
  }

  private handleOpen(): void {
    this.emit('connected');
    this.reconnectAttempts = 0;
    this.authExpired = false;
    this.flushMessageQueue();
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const payload: IpcPayload = JSON.parse(event.data);
      this.metrics.messagesReceived++;

      if (payload.channel) {
        this.emit(payload.channel, payload.data);
        this.emit('message', payload);
      }
    } catch {
      this.metrics.errors++;
    }
  }

  private handleClose(event: CloseEvent): void {
    this.ws = null;

    if (event.code === AUTH_EXPIRED_CODE || this.authExpired) {
      this.shouldReconnect = false;
      this.emit('auth:expired');
      this.emit('redirect:login');
      return;
    }

    if (this.shouldReconnect && this.config.reconnect) {
      this.scheduleReconnect();
    }
    this.emit('disconnected');
  }

  private handleError(event: Event): void {
    this.metrics.errors++;
    this.emit('bridge:error', { error: 'WebSocket error', code: 'WS_ERROR' });
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect || this.authExpired) return;
    if (this.config.maxReconnectAttempts && this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.emit('reconnect:exhausted');
      return;
    }

    const delay = Math.min(INITIAL_BACKOFF_MS * Math.pow(2, this.reconnectAttempts), MAX_BACKOFF_MS);
    this.reconnectAttempts++;

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.createConnection();
    }, delay);

    this.emit('reconnect:scheduled', { delay, attempt: this.reconnectAttempts });
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const item = this.messageQueue.shift();
      if (item) this.send(item.channel, item.data);
    }
  }

  setAuthExpired(): void {
    this.authExpired = true;
    this.shouldReconnect = false;
  }

  registerBridgeHandler(channel: string, handler: BridgeHandler): void {
    this.registerHandler(channel, handler);
  }
}

export function createWebSocketTransport(config: WebSocketConfig): WebSocketTransport {
  return new WebSocketTransport(config);
}