import { BasePlugin, ChannelMessage, ChannelConfig, ChannelCredentials } from './BasePlugin';
import { SessionManager } from './SessionManager';
import { PairingService } from './PairingService';
import { ActionExecutor } from './ActionExecutor';
import { EventDeduplicator } from './EventDeduplicator';

export interface WeChatMessage {
  msg_type: string;
  msg_id: string;
  from_username: string;
  to_username: string;
  agent_id?: string;
  content: string;
  event?: string;
  create_time: number;
}

export class WeChatPlugin extends BasePlugin {
  protected platformName = 'wechat';
  private sessionManager: SessionManager;
  private pairingService: PairingService;
  private actionExecutor: ActionExecutor;
  private deduplicator: EventDeduplicator;
  private apiBase: string;
  private corpId: string;

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
    this.apiBase = 'https://qyapi.weixin.qq.com';
    this.corpId = this.getConfigValue('corpId') || '';
  }

  async init(): Promise<void> {
    if (!this.credentials.apiKey) {
      throw new Error('WeChat Work API key is required');
    }
  }

  async connect(): Promise<void> {
    await this.validateCredentials();
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

  async handleWeChatMessage(event: WeChatMessage): Promise<void> {
    const userId = event.from_username;
    const chatId = event.agent_id || event.to_username;
    const messageId = event.msg_id;
    let content = event.content;
    let type: ChannelMessage['type'] = 'text';
    if (event.msg_type === 'image') {
      content = `[Image: ${event.msg_id}]`;
      type = 'image';
    } else if (event.msg_type === 'voice') {
      content = `[Voice: ${event.msg_id}]`;
      type = 'file';
    } else if (event.msg_type === 'event') {
      return;
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
    const token = await this.getAccessToken();
    const url = `${this.apiBase}/cgi-bin/message/send?access_token=${token}`;
    const body = {
      touser: chatId,
      msgtype: 'text',
      agentid: this.getConfigValue('agentId') || '',
      text: { content },
    };
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`WeChat API error: ${response.status}`);
    }
  }

  async getAccessToken(): Promise<string> {
    const url = `${this.apiBase}/cgi-bin/gettoken?corpid=${this.corpId}&corpsecret=${this.credentials.apiKey}`;
    const response = await fetch(url);
    const data = await response.json() as { access_token?: string };
    if (!data.access_token) {
      throw new Error('Failed to get WeChat access token');
    }
    return data.access_token;
  }

  async validateCredentials(): Promise<void> {
    try {
      await this.getAccessToken();
    } catch {
      throw new Error('WeChat credentials validation failed');
    }
  }

  registerWebhookHandler(handler: (event: WeChatMessage) => Promise<void>): void {
    this.on('webhook:message', handler);
  }

  private getConfigValue(key: string): string {
    return (this.config as Record<string, unknown>)[key] as string || '';
  }
}