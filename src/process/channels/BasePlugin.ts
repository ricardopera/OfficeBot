import { EventEmitter } from 'events';

export interface ChannelMessage {
  type: 'text' | 'image' | 'file' | 'tool_call' | 'tool_result';
  content: string;
  platform: string;
  userId: string;
  chatId: string;
  messageId?: string;
  metadata?: Record<string, unknown>;
}

export interface ChannelCredentials {
  botToken?: string;
  appId?: string;
  appSecret?: string;
  apiKey?: string;
  webhookSecret?: string;
}

export interface ChannelConfig {
  enabled: boolean;
  yoloMode?: boolean;
  modelResolution?: 'config' | 'oauth' | 'api_key' | 'fallback';
  streamingThrottle?: number;
  maxMediaSize?: number;
}

export abstract class BasePlugin extends EventEmitter {
  protected config: ChannelConfig;
  protected credentials: ChannelCredentials;
  protected abstract platformName: string;

  constructor(config: ChannelConfig, credentials: ChannelCredentials) {
    super();
    this.config = {
      enabled: true,
      yoloMode: true,
      modelResolution: 'config',
      streamingThrottle: 500,
      maxMediaSize: 200 * 1024 * 1024,
      ...config,
    };
    this.credentials = credentials;
  }

  abstract init(): Promise<void>;
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract handleMessage(message: ChannelMessage): Promise<void>;

  protected validatePath(path: string, workspace: string): boolean {
    const normalized = path.replace(/\\/g, '/');
    const workspaceNormalized = workspace.replace(/\\/g, '/');
    return normalized.startsWith(workspaceNormalized) || normalized.startsWith('./');
  }

  protected validateMediaSize(size: number): boolean {
    return size <= (this.config.maxMediaSize ?? 200 * 1024 * 1024);
  }

  getPlatformName(): string {
    return this.platformName;
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  getYoloMode(): boolean {
    return this.config.yoloMode ?? true;
  }
}