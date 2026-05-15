import { BasePlugin, ChannelMessage, ChannelConfig, ChannelCredentials } from './BasePlugin';
import { SessionManager } from './SessionManager';
import { PairingService } from './PairingService';
import { ActionExecutor } from './ActionExecutor';
import { EventDeduplicator } from './EventDeduplicator';

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: { id: number; username?: string };
    chat: { id: number; type: string };
    text?: string;
    photo?: Array<{ file_id: string }>;
    document?: { file_id: string };
  };
  edited_message?: unknown;
  callback_query?: unknown;
}

export class TelegramPlugin extends BasePlugin {
  protected platformName = 'telegram';
  private webhookServer: { stop: () => void } | null = null;
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
    this.apiBase = 'https://api.telegram.org';
  }

  async init(): Promise<void> {
    if (!this.credentials.botToken) {
      throw new Error('Telegram bot token is required');
    }
  }

  async connect(): Promise<void> {
    await this.setupWebhook();
    this.emit('connected', { platform: this.platformName });
  }

  async disconnect(): Promise<void> {
    if (this.webhookServer) {
      this.webhookServer.stop();
      this.webhookServer = null;
    }
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

  async handleUpdate(update: TelegramUpdate): Promise<void> {
    if (update.edited_message || update.callback_query) {
      return;
    }
    const message = update.message;
    if (!message) return;
    const userId = message.from.id.toString();
    const chatId = message.chat.id.toString();
    const messageId = message.message_id.toString();
    let content = '';
    let type: ChannelMessage['type'] = 'text';
    if (message.text) {
      content = message.text;
    } else if (message.photo && message.photo.length > 0) {
      content = `[Photo: ${message.photo[0].file_id}]`;
      type = 'image';
    } else if (message.document) {
      content = `[Document: ${message.document.file_id}]`;
      type = 'file';
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

  async sendMessage(chatId: string, text: string): Promise<void> {
    const token = this.credentials.botToken;
    if (!token) throw new Error('Bot token not configured');
    const url = `${this.apiBase}/bot${token}/sendMessage`;
    const body = { chat_id: chatId, text };
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.status}`);
    }
  }

  async sendMedia(chatId: string, mediaType: 'photo' | 'document', fileId: string, caption?: string): Promise<void> {
    const token = this.credentials.botToken;
    if (!token) throw new Error('Bot token not configured');
    const url = `${this.apiBase}/bot${token}/send${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)}`;
    const body: Record<string, unknown> = { chat_id: chatId, [mediaType]: fileId };
    if (caption) body.caption = caption;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.status}`);
    }
  }

  private async setupWebhook(): Promise<void> {
    const token = this.credentials.botToken;
    if (!token) return;
    const webhookInfo = await this.getWebhookInfo();
    if (webhookInfo.url) {
      await this.deleteWebhook();
    }
  }

  private async getWebhookInfo(): Promise<{ url: string }> {
    const token = this.credentials.botToken!;
    const response = await fetch(`${this.apiBase}/bot${token}/getWebhookInfo`);
    const data = await response.json() as { result?: { url: string } };
    return { url: data.result?.url || '' };
  }

  private async deleteWebhook(): Promise<void> {
    const token = this.credentials.botToken!;
    await fetch(`${this.apiBase}/bot${token}/deleteWebhook`);
  }

  registerWebhookHandler(handler: (update: TelegramUpdate) => Promise<void>): void {
    this.on('webhook:update', handler);
  }
}