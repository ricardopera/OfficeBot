import { BasePlugin, ChannelMessage, ChannelConfig, ChannelCredentials } from './BasePlugin';
import { SessionManager } from './SessionManager';
import { PairingService } from './PairingService';
import { ActionExecutor } from './ActionExecutor';
import { EventDeduplicator } from './EventDeduplicator';

type DegradationMode = 'ai_card' | 'session_webhook' | 'open_api';

export interface DingTalkMessage {
  msg_type: string;
  message_id: string;
  sender_nick: string;
  sender_id: { string: string };
  conversation_id: string;
  conversation_type: string;
  content: string;
  create_at: number;
}

export class DingTalkPlugin extends BasePlugin {
  protected platformName = 'dingtalk';
  private degradationMode: DegradationMode = 'ai_card';
  private sessionManager: SessionManager;
  private pairingService: PairingService;
  private actionExecutor: ActionExecutor;
  private deduplicator: EventDeduplicator;
  private apiBase: string;
  private fallbackChain: DegradationMode[] = ['ai_card', 'session_webhook', 'open_api'];

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
    this.apiBase = 'https://oapi.dingtalk.com';
    this.initializeDegradation();
  }

  private async initializeDegradation(): Promise<void> {
    const mode = this.getConfigValue('degradationMode') as DegradationMode;
    if (mode && this.fallbackChain.includes(mode)) {
      this.degradationMode = mode;
    }
  }

  private async tryDegrade(): Promise<void> {
    const currentIndex = this.fallbackChain.indexOf(this.degradationMode);
    if (currentIndex < this.fallbackChain.length - 1) {
      this.degradationMode = this.fallbackChain[currentIndex + 1];
      this.emit('degradation:mode_changed', { mode: this.degradationMode, platform: this.platformName });
    }
  }

  getDegradationMode(): DegradationMode {
    return this.degradationMode;
  }

  async init(): Promise<void> {
    if (!this.credentials.appId || !this.credentials.appSecret) {
      throw new Error('DingTalk appId and appSecret are required');
    }
  }

  async connect(): Promise<void> {
    await this.setupCallback();
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

  async handleDingTalkMessage(event: DingTalkMessage): Promise<void> {
    try {
      const userId = event.sender_id?.string || '';
      const chatId = event.conversation_id;
      const messageId = event.message_id;
      let content = '';
      let type: ChannelMessage['type'] = 'text';
      try {
        const parsed = JSON.parse(event.content);
        if (event.msg_type === 'text') {
          content = parsed.text || '';
        } else if (event.msg_type === 'pic') {
          content = `[Image: ${parsed.image_url}]`;
          type = 'image';
        } else if (event.msg_type === 'file') {
          content = `[File: ${parsed.file_url}]`;
          type = 'file';
        } else {
          content = JSON.stringify(parsed);
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
    } catch (error) {
      await this.handleDegradationError(error as Error);
    }
  }

  private async handleDegradationError(error: Error): Promise<void> {
    this.emit('error', { platform: this.platformName, error: error.message });
    await this.tryDegrade();
  }

  async sendMessage(chatId: string, content: string): Promise<void> {
    try {
      if (this.degradationMode === 'ai_card') {
        await this.sendAICard(chatId, content);
      } else if (this.degradationMode === 'session_webhook') {
        await this.sendViaSessionWebhook(chatId, content);
      } else {
        await this.sendViaOpenAPI(chatId, content);
      }
    } catch (error) {
      await this.handleDegradationError(error as Error);
    }
  }

  private async sendAICard(chatId: string, content: string): Promise<void> {
    const token = await this.getAccessToken();
    const url = `${this.apiBase}/topapi/im/v2/messages`;
    const body = {
      robot_code: this.credentials.appId,
      receiver: chatId,
      msg_type: 'interactive',
      msg_content: JSON.stringify({
        card: {
          config: { auto_icon: true },
          elements: [{ tag: 'markdown', content }],
        },
      }),
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
      throw new Error(`AI Card failed: ${response.status}`);
    }
  }

  private async sendViaSessionWebhook(chatId: string, content: string): Promise<void> {
    const webhookUrl = this.getConfigValue('sessionWebhookUrl') as string;
    if (!webhookUrl) throw new Error('sessionWebhookUrl not configured');
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, content }),
    });
    if (!response.ok) {
      throw new Error(`Session webhook failed: ${response.status}`);
    }
  }

  private async sendViaOpenAPI(chatId: string, content: string): Promise<void> {
    const token = await this.getAccessToken();
    const url = `${this.apiBase}/topapi/message/v2/send`;
    const body = {
      agent_id: this.getConfigValue('agentId') || '',
      userid_list: chatId,
      msg_type: 'text',
      text: { content },
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
      throw new Error(`Open API failed: ${response.status}`);
    }
  }

  async getAccessToken(): Promise<string> {
    const url = `${this.apiBase}/gettoken?appkey=${this.credentials.appId}&appsecret=${this.credentials.appSecret}`;
    const response = await fetch(url);
    const data = await response.json() as { access_token?: string };
    if (!data.access_token) {
      throw new Error('Failed to get DingTalk access token');
    }
    return data.access_token;
  }

  registerWebhookHandler(handler: (event: DingTalkMessage) => Promise<void>): void {
    this.on('webhook:message', handler);
  }

  private getConfigValue(key: string): string {
    return (this.config as Record<string, unknown>)[key] as string || '';
  }
}