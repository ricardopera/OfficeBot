import { EventEmitter } from 'events';
import { BaseBridge, IpcPayload, validatePayloadSize, createCodexRemap } from '../contracts/ipcBridge';
import { ElectronTransport } from './electron/ElectronTransport';
import { WebSocketTransport } from './websocket/WebSocketTransport';
import { StandaloneTransport } from './standalone/StandaloneTransport';
import * as chatHandlers from './handlers/chatHandlers';
import * as conversationHandlers from './handlers/conversationHandlers';
import * as agentHandlers from './handlers/agentHandlers';
import * as settingsHandlers from './handlers/settingsHandlers';
import * as teamHandlers from './handlers/teamHandlers';

export type TransportType = 'electron' | 'websocket' | 'standalone';

interface BridgeConfig {
  transport: TransportType;
  websocketUrl?: string;
  authToken?: string;
}

const MAX_PAYLOAD_SIZE = 50 * 1024 * 1024;

export class BridgeManager extends EventEmitter {
  private electronTransport: ElectronTransport;
  private websocketTransport: WebSocketTransport | null = null;
  private standaloneTransport: StandaloneTransport;
  private activeTransport: BaseBridge;
  private fileMigrationPending = false;

  constructor() {
    super();
    this.electronTransport = new ElectronTransport();
    this.standaloneTransport = new StandaloneTransport();
    this.activeTransport = this.electronTransport;
    this.registerAllHandlers();
  }

  setTransport(config: BridgeConfig): void {
    switch (config.transport) {
      case 'websocket':
        if (!this.websocketTransport && config.websocketUrl) {
          this.websocketTransport = new WebSocketTransport({
            url: config.websocketUrl,
            authToken: config.authToken,
          });
          this.websocketTransport.on('auth:expired', () => this.handleAuthExpired());
          this.websocketTransport.on('redirect:login', () => this.emit('redirect:login'));
        }
        this.activeTransport = this.websocketTransport!;
        break;
      case 'standalone':
        this.activeTransport = this.standaloneTransport;
        break;
      default:
        this.activeTransport = this.electronTransport;
    }
    this.activeTransport.connect();
  }

  private registerAllHandlers(): void {
    const registerProvider = (channel: string, handler: (p: IpcPayload) => Promise<unknown>) => {
      this.electronTransport.registerHandler(channel, { channel, handle: handler });
      this.standaloneTransport.registerProvider(channel, handler);
    };

    Object.entries(chatHandlers).forEach(([channel, handler]) => registerProvider(channel, handler));
    Object.entries(conversationHandlers).forEach(([channel, handler]) => registerProvider(channel, handler));
    Object.entries(agentHandlers).forEach(([channel, handler]) => registerProvider(channel, handler));
    Object.entries(settingsHandlers).forEach(([channel, handler]) => registerProvider(channel, handler));
    Object.entries(teamHandlers).forEach(([channel, handler]) => registerProvider(channel, handler));
  }

  private handleAuthExpired(): void {
    this.emit('auth:expired');
  }

  async invoke(channel: string, data: unknown): Promise<unknown> {
    if (!validatePayloadSize(data)) {
      this.activeTransport.metrics.droppedEvents++;
      this.emit('bridge:error', { channel, error: 'Payload exceeds 50MB', code: 'PAYLOAD_TOO_LARGE' });
      throw new Error('Payload too large');
    }

    const remapped = createCodexRemap(channel);
    const payload: IpcPayload = {
      type: remapped.type,
      channel: channel,
      data,
      timestamp: Date.now(),
    };

    try {
      const result = await this.activeTransport.executeHandler(channel, payload);
      return result;
    } catch (error) {
      this.activeTransport.metrics.errors++;
      throw error;
    }
  }

  emit(channel: string, data: unknown): void {
    if (!validatePayloadSize(data)) {
      this.activeTransport.metrics.droppedEvents++;
      this.emit('bridge:error', { channel, error: 'Payload exceeds 50MB', code: 'PAYLOAD_TOO_LARGE' });
      return;
    }
    this.activeTransport.emit(channel, data);
  }

  triggerModelChange(conversationId: string, oldModel: string, newModel: string): void {
    if (JSON.stringify(oldModel) !== JSON.stringify(newModel)) {
      this.emit('agent:kill', { conversationId, reason: 'model_change' });
      this.emit('agent:rebuild', { conversationId, reason: 'model_change' });
    }
  }

  triggerLazyMigration(): void {
    if (this.fileMigrationPending) return;
    this.fileMigrationPending = true;
    setImmediate(() => {
      this.emit('migration:file:start');
      setTimeout(() => {
        this.emit('migration:file:complete');
        this.fileMigrationPending = false;
      }, 100);
    });
  }

  triggerSkillsDiscovery(conversationId: string): void {
    this.emit('skills:discover', { conversationId, timestamp: Date.now() });
  }

  getMetrics() {
    return this.activeTransport.getMetrics();
  }

  disconnect(): void {
    this.electronTransport.disconnect();
    this.websocketTransport?.disconnect();
    this.standaloneTransport.disconnect();
  }
}

export const bridgeManager = new BridgeManager();