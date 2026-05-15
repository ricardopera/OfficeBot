import { EventEmitter } from 'events';

interface ExtensionEvent {
  source: string;
  type: string;
  payload: unknown;
  timestamp: number;
}

export class ExtensionEventBus extends EventEmitter {
  private static instance: ExtensionEventBus | null = null;
  private events: ExtensionEvent[] = [];

  constructor() {
    super();
    this.setMaxListeners(100);
  }

  static getInstance(): ExtensionEventBus {
    if (!ExtensionEventBus.instance) {
      ExtensionEventBus.instance = new ExtensionEventBus();
    }
    return ExtensionEventBus.instance;
  }

  emitEvent(source: string, type: string, payload: unknown): void {
    const event: ExtensionEvent = {
      source,
      type,
      payload,
      timestamp: Date.now(),
    };

    this.events.push(event);
    this.emit(type, { source, payload });
  }

  getEventsBySource(source: string): ExtensionEvent[] {
    return this.events.filter((e) => e.source === source);
  }

  clear(): void {
    this.events = [];
  }
}