import { MessageRepository, Message } from './MessageRepository'

interface BufferedChunk {
  conversationId: string
  messageId: string
  content: string
  timestamp: number
}

export class StreamingMessageBuffer {
  private buffer: Map<string, BufferedChunk[]> = new Map()
  private flushTimers: Map<string, NodeJS.Timeout> = new Map()
  private readonly FLUSH_INTERVAL_MS = 300
  private readonly MAX_CHUNKS = 20

  constructor(private messageRepo: MessageRepository) {}

  append(conversationId: string, messageId: string, chunk: string): void {
    if (!this.buffer.has(conversationId)) {
      this.buffer.set(conversationId, [])
    }

    const chunks = this.buffer.get(conversationId)!
    const existing = chunks.find(c => c.messageId === messageId)
    if (existing) {
      existing.content += chunk
    } else {
      chunks.push({ conversationId, messageId, content: chunk, timestamp: Date.now() })
    }

    if (chunks.length >= this.MAX_CHUNKS) {
      this.flush(conversationId, messageId)
    } else if (!this.flushTimers.has(conversationId)) {
      const timer = setTimeout(() => this.flushAll(conversationId), this.FLUSH_INTERVAL_MS)
      this.flushTimers.set(conversationId, timer)
    }
  }

  private flush(conversationId: string, messageId: string): void {
    const chunks = this.buffer.get(conversationId)
    if (!chunks) return

    const idx = chunks.findIndex(c => c.messageId === messageId)
    if (idx === -1) return

    const [item] = chunks.splice(idx, 1)
    this.persist(item)

    if (chunks.length === 0) {
      this.buffer.delete(conversationId)
      const timer = this.flushTimers.get(conversationId)
      if (timer) {
        clearTimeout(timer)
        this.flushTimers.delete(conversationId)
      }
    }
  }

  private flushAll(conversationId: string): void {
    const chunks = this.buffer.get(conversationId)
    if (!chunks) return

    this.flushTimers.delete(conversationId)
    for (const chunk of chunks) {
      this.persist(chunk)
    }
    this.buffer.delete(conversationId)
  }

  private persist(chunk: BufferedChunk): void {
    this.messageRepo.updateContent(chunk.messageId, chunk.content)
    this.messageRepo.updateStatus(chunk.messageId, 'finish')
  }

  shutdown(): void {
    for (const [conversationId] of this.buffer) {
      this.flushAll(conversationId)
    }
    for (const timer of this.flushTimers.values()) {
      clearTimeout(timer)
    }
    this.flushTimers.clear()
    this.buffer.clear()
  }
}