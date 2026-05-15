import { BridgeModule, BridgeDependencies, ProviderContract, EmitterContract, BridgeContract } from './IpcBridge';
import { IpcTransportType } from './types';

export interface BridgeRegistration {
  name: string;
  module: BridgeModule;
  priority: number;
  transport: IpcTransportType;
}

export interface BridgeRegistryOptions {
  enableLazyLoading?: boolean;
  maxBridges?: number;
}

export interface BridgeRegistry {
  register(registration: BridgeRegistration): void;
  unregister(name: string): boolean;
  get(name: string): BridgeModule | undefined;
  getAll(): BridgeModule[];
  getByTransport(transport: IpcTransportType): BridgeModule[];
  resolveHandler(name: string): ProviderContract | undefined;
  resolveEmitter(name: string): EmitterContract | undefined;
  has(name: string): boolean;
  initializeAll(deps: BridgeDependencies): Promise<void>;
  destroyAll(): void;
  getCount(): number;
}

export function createBridgeRegistry(options: BridgeRegistryOptions = {}): BridgeRegistry {
  const { enableLazyLoading = true, maxBridges = 100 } = options;

  const bridges = new Map<string, BridgeModule>();
  const handlers = new Map<string, ProviderContract>();
  const emitters = new Map<string, EmitterContract>();
  const registrations = new Map<string, BridgeRegistration>();

  function register(registration: BridgeRegistration): void {
    if (bridges.size >= maxBridges) {
      throw new Error(`Bridge registry full: max ${maxBridges} bridges`);
    }
    registrations.set(registration.name, registration);
    bridges.set(registration.name, registration.module);
  }

  function unregister(name: string): boolean {
    const module = bridges.get(name);
    if (!module) return false;

    module.destroy();
    bridges.delete(name);
    registrations.delete(name);

    for (const [handlerName, handler] of handlers.entries()) {
      if (handlerName.startsWith(`${name}:`)) {
        handlers.delete(handlerName);
      }
    }
    for (const [emitterName, emitter] of emitters.entries()) {
      if (emitterName.startsWith(`${name}:`)) {
        emitters.delete(emitterName);
      }
    }

    return true;
  }

  function get(name: string): BridgeModule | undefined {
    return bridges.get(name);
  }

  function getAll(): BridgeModule[] {
    return Array.from(bridges.values());
  }

  function getByTransport(transport: IpcTransportType): BridgeModule[] {
    return Array.from(registrations.values())
      .filter(r => r.transport === transport)
      .map(r => r.module);
  }

  function resolveHandler(name: string): ProviderContract | undefined {
    return handlers.get(name);
  }

  function resolveEmitter(name: string): EmitterContract | undefined {
    return emitters.get(name);
  }

  function has(name: string): boolean {
    return bridges.has(name);
  }

  async function initializeAll(deps: BridgeDependencies): Promise<void> {
    const sorted = Array.from(registrations.values()).sort((a, b) => a.priority - b.priority);

    for (const reg of sorted) {
      await reg.module.initialize(deps);

      for (const [pName, provider] of reg.module.providers.entries()) {
        handlers.set(`${reg.name}:${pName}`, provider);
      }
      for (const [eName, emitter] of reg.module.emitters.entries()) {
        emitters.set(`${reg.name}:${eName}`, emitter);
      }
    }
  }

  function destroyAll(): void {
    for (const module of bridges.values()) {
      try {
        module.destroy();
      } catch (err) {
        console.error(`Error destroying bridge ${module.name}:`, err);
      }
    }
    bridges.clear();
    handlers.clear();
    emitters.clear();
    registrations.clear();
  }

  function getCount(): number {
    return bridges.size;
  }

  return {
    register,
    unregister,
    get,
    getAll,
    getByTransport,
    resolveHandler,
    resolveEmitter,
    has,
    initializeAll,
    destroyAll,
    getCount,
  };
}

export function createBridgeModule(
  name: string,
  providers: Map<string, ProviderContract> = new Map(),
  emitters: Map<string, EmitterContract> = new Map()
): BridgeModule {
  let initialized = false;

  return {
    name,
    providers,
    emitters,
    async initialize(_deps: BridgeDependencies): Promise<void> {
      initialized = true;
    },
    destroy(): void {
      initialized = false;
      providers.clear();
      emitters.clear();
    },
  };
}

export function createProvider<TParams = unknown, TResult = unknown>(
  name: string,
  handler: (params: TParams) => Promise<TResult>,
  transport: IpcTransportType = 'electron'
): ProviderContract<TParams, TResult> {
  return {
    name,
    transport,
    isInitialized(): boolean {
      return true;
    },
    invoke: handler,
    destroy(): void {},
  };
}

export function createEmitter<TPayload = unknown>(
  name: string,
  transport: IpcTransportType = 'electron'
): EmitterContract<TPayload> {
  const listeners = new Set<(payload: TPayload) => void>();

  return {
    name,
    transport,
    isInitialized(): boolean {
      return true;
    },
    emit(event: string, payload: TPayload): void {
      listeners.forEach(listener => listener(payload));
    },
    on(event: string, handler: (payload: TPayload) => void): void {
      if (event === name) {
        listeners.add(handler);
      }
    },
    off(event: string, handler: (payload: TPayload) => void): void {
      if (event === name) {
        listeners.delete(handler);
      }
    },
    destroy(): void {
      listeners.clear();
    },
  };
}

export const BRIDGE_PRIORITIES = {
  CORE: 0,
  DATABASE: 10,
  SERVICES: 20,
  AGENT: 30,
  CONVERSATION: 40,
  CHANNEL: 50,
  EXTENSION: 60,
  UI: 70,
} as const;

export const CORE_BRIDGES = [
  'system',
  'config',
  'database',
] as const;

export function isCoreBridge(name: string): boolean {
  return CORE_BRIDGES.includes(name as typeof CORE_BRIDGES[number]);
}

export function getBridgePriority(category: keyof typeof BRIDGE_PRIORITIES): number {
  return BRIDGE_PRIORITIES[category] ?? 50;
}