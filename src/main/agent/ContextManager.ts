import type { CoreMessage } from 'ai';
import type { ModelInfo } from '../providers/types';
import { CONTEXT_COMPRESSION_THRESHOLD } from '@shared/constants';

const CHARS_PER_TOKEN = 4; // rough approximation

export class ContextManager {
  estimateTokens(messages: CoreMessage[]): number {
    let total = 0;
    for (const msg of messages) {
      if (typeof msg.content === 'string') {
        total += Math.ceil(msg.content.length / CHARS_PER_TOKEN);
      } else if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if ('text' in part && typeof part.text === 'string') {
            total += Math.ceil(part.text.length / CHARS_PER_TOKEN);
          }
        }
      }
    }
    return total;
  }

  getRemainingBudget(messages: CoreMessage[], modelInfo: ModelInfo): number {
    const used = this.estimateTokens(messages);
    return modelInfo.contextWindow - used;
  }

  shouldCompress(messages: CoreMessage[], modelInfo: ModelInfo): boolean {
    const used = this.estimateTokens(messages);
    return used / modelInfo.contextWindow >= CONTEXT_COMPRESSION_THRESHOLD;
  }

  getUsagePercent(messages: CoreMessage[], modelInfo: ModelInfo): number {
    const used = this.estimateTokens(messages);
    return Math.round((used / modelInfo.contextWindow) * 100);
  }

  /**
   * Simple compression: truncate large tool results and remove old messages.
   */
  compressHistory(messages: CoreMessage[]): CoreMessage[] {
    // Keep system prompt (first message) and last N messages
    const MAX_KEEP = 20;

    const compressed: CoreMessage[] = [];

    for (const msg of messages) {
      if (msg.role !== 'tool' && typeof msg.content === 'string' && msg.content.length > 5000) {
        compressed.push({
          ...msg,
          content: msg.content.slice(0, 5000) + '\n... [conteúdo truncado para economizar contexto]',
        });
        continue;
      }

      compressed.push(msg);
    }

    // If still too many messages, keep system prompt + last MAX_KEEP
    if (compressed.length > MAX_KEEP + 1) {
      const system = compressed.filter((m) => m.role === 'system');
      const rest = compressed.filter((m) => m.role !== 'system');
      return [...system, ...rest.slice(-MAX_KEEP)];
    }

    return compressed;
  }
}
