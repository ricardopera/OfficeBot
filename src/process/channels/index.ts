export { BasePlugin } from './BasePlugin';
export type { ChannelMessage, ChannelCredentials, ChannelConfig } from './BasePlugin';

export { TelegramPlugin } from './TelegramPlugin';
export type { TelegramUpdate } from './TelegramPlugin';

export { LarkPlugin } from './LarkPlugin';
export type { LarkMessage } from './LarkPlugin';

export { DingTalkPlugin } from './DingTalkPlugin';
export type { DingTalkMessage, DegradationMode } from './DingTalkPlugin';

export { WeChatPlugin } from './WeChatPlugin';
export type { WeChatMessage } from './WeChatPlugin';

export { WeComPlugin } from './WeComPlugin';
export type { WeComMessage } from './WeComPlugin';

export { PairingService } from './PairingService';
export type { PairingCode } from './PairingService';

export { SessionManager } from './SessionManager';
export type { ChannelSession } from './SessionManager';

export { ActionExecutor } from './ActionExecutor';
export type { ToolContinuation } from './ActionExecutor';

export { EventDeduplicator } from './EventDeduplicator';
export type { DedupEntry } from './EventDeduplicator';

export type { BasePlugin as ChannelPlugin } from './BasePlugin';

export const CHANNEL_RULES = {
  PAIRING_CODE_LENGTH: 6,
  PAIRING_CODE_TTL_MS: 10 * 60 * 1000,
  STREAM_THROTTLE_MS: 500,
  MAX_MEDIA_SIZE: 200 * 1024 * 1024,
  TOOL_CONTINUATION_WAIT_MS: 15 * 1000,
  EVENT_DEDUP_CACHE_TTL_MS: 5 * 60 * 1000,
  EVENT_DEDUP_CLEANUP_INTERVAL_MS: 60 * 1000,
} as const;