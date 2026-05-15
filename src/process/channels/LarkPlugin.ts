import { BasePlugin, ChannelMessage, ChannelConfig, ChannelCredentials } from './BasePlugin';
import { SessionManager } from './SessionManager';
import { PairingService } from './PairingService';
import { ActionExecutor } from './ActionExecutor';
import { EventDeduplicator } from './EventDeduplicator';

export interface LarkMessage {
  msg_type: string;
  message_id: string;
  sender: { sender_id: { open_id: string }; sender_type: string };
  chat_id: string;
  content: string;
  create_time: string;
}

export class LarkPlugin extends BasePlugin {
  protected platformName = 'lark';
  private oauthState: Map<string, string> = new Map();
  private sessionManager: SessionManager;
  private pairingService: PairingService;
  private actionExecutor: ActionExecutor;
  private deduplicator: EventDeduplicator;
  private apiBase: string;

  constructor(
    config: ChannelConfig,
    credentials: ChannelCredentials,
    sessionManager: SessionManager,
    pairingService: PairingService,
    deduplicator: EventDeduplicator
  ) {
    super(config, credentials);
    this.sessionManager = sessionManager;
    this.pairingService = pairingService;
    this.deduplicator = deduplicator;
    this.actionExecutor = new ActionExecutor(deduplicator, config.yoloMode ?? true);
    this.apiBase = 'https://open.larksuite.com/open-apis';
  }

  async init(): Promise<void> {
    if (!this.credentials.appId || !this.credentials.appSecret) {
      throw new Error('Lark appId and appSecret are required');
    }
  }

  async connect(): Promise<void> {
    await this.registerWebhook();
    this.emit('connected', { platform: this.platformName });
  }

  async disconnect(): Promise<void> {
    this.emit('disconnected', { platform: this.platformName });
  }

  async handleMessage(message: ChannelMessage): Promise<void> {
    const session = this.sessionManager.get(message.userId, message.chatId);
    if (!session || session.status !== 'active') {
      const pairingCode = this.pairingService.generate(this.platformName, message.chatId, message.userId);
      this.emit('pairing:required', { chatId: message.chatId, code: pairingCode });
      return;
    }
    const { shouldProcess, duplicate } = await this.actionExecutor.handleMessage(
      this.platformName,
      message.userId,
      message.chatId,
      message.messageId || '',
      message.content
    );
    if (!shouldProcess) {
      if (duplicate) {
        this.emit('message:duplicate', { messageId: message.messageId });
      }
      return;
    }
    this.emit('message:received', {
      platform: this.platformName,
      userId: message.userId,
      chatId: message.chatId,
      content: message.content,
      type: message.type,
    });
  }

  async handleLarkMessage(event: LarkMessage): Promise<void> {
    const userId = event.sender.sender_id.open_id;
    const chatId = event.chat_id;
    const messageId = event.message_id;
    let content = '';
    let type: ChannelMessage['type'] = 'text';
    try {
      const parsed = JSON.parse(event.content);
      if (event.msg_type === 'text') {
        content = parsed.text || '';
      } else if (event.msg_type === 'image') {
        content = `[Image: ${parsed.image_key}]`;
        type = 'image';
      } else if (event.msg_type === 'file') {
        content = `[File: ${parsed.file_key}]`;
        type = 'file';
      }
    } catch {
      content = event.content;
    }
    const channelMessage: ChannelMessage = {
      type,
      content,
      platform: this.platformName,
      userId,
      chatId,
      messageId,
    };
    await this.handleMessage(channelMessage);
  }

  async sendMessage(chatId: string, content: string): Promise<void> {
    const token = await this.getTenantAccessToken();
    const url = `${this.apiBase}/im/v1/messages?receive_id_type=chat_id`;
    const body = {
      receive_id: chatId,
      msg_type: 'text',
      content: JSON.stringify({ text: content }),
    };
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`Lark API error: ${response.status}`);
    }
  }

  async getTenantAccessToken(): Promise<string> {
    const url = `${this.apiBase}/auth/v3/tenant_access_token/internal`;
    const body = {
      app_id: this.credentials.appId,
      app_secret: this.credentials.appSecret,
    };
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json() as { tenant_access_token?: string };
    if (!data.tenant_access_token) {
      throw new Error('Failed to get Lark tenant access token');
    }
    return data.tenant_access_token;
  }

  buildOAuthUrl(state: string): string {
    const redirectUri = encodeURIComponent(this.getConfigValue('redirectUri') || '');
    return `https://open.larksuite.com/open-apis/auth/v2/authorize?client_id=${this.credentials.appId}&redirect_uri=${redirectUri}&response_type=code&scope=im:message&state=${state}`;
  }

  async exchangeCodeForToken(code: string): Promise<{ access_token: string; refresh_token: string }> {
    const url = `${this.apiBase}/authen/v1/oidc/access_token`;
    const body = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.getConfigValue('redirectUri') || '',
    };
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await this.getTenantAccessToken()}`,
      },
      body: JSON.stringify(body),
    });
    const data = await response.json() as { data?: { access_token: string; refresh_token: string } };
    if (!data.data) {
      throw new Error('Failed to exchange Lark OAuth code');
    }
    return data.data;
  }

  registerWebhookHandler(handler: (event: LarkMessage) => Promise<void>): void {
    this.on('webhook:message', handler);
  }

  private getConfigValue(key: string): string {
    return (this.config as Record<string, unknown>)[key] as string || '';
  }
}