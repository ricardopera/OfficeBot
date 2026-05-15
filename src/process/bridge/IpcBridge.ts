import { EventEmitter } from 'events';
import { TProviderResponse, TEmitterPayload, IpcTransportType, BridgeConfig } from './types';

export interface IpcHandler<TParams = unknown, TResult = unknown> {
  invoke(params: TParams): Promise<TResult>;
}

export interface BridgeContract {
  name: string;
  transport: IpcTransportType;
  isInitialized(): boolean;
  destroy(): void;
}

export interface ProviderContract<TParams = unknown, TResult = unknown> extends BridgeContract {
  invoke(params: TParams): Promise<TResult>;
}

export interface EmitterContract<TPayload = unknown> extends BridgeContract {
  emit(event: string, payload: TPayload): void;
  on(event: string, handler: (payload: TPayload) => void): void;
  off(event: string, handler: (payload: TPayload) => void): void;
}

export interface IpcAdapter {
  emit(event: string, payload: TEmitterPayload): boolean;
  on(event: string, handler: (payload: TEmitterPayload) => void): void;
  off(event: string, handler: (payload: TEmitterPayload) => void): void;
}

export interface TransportAdapter extends IpcAdapter {
  readonly type: IpcTransportType;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}

export interface ElectronTransportAdapter extends TransportAdapter {
  readonly type: 'electron';
  readonly ipcRenderer: Electron.IpcRenderer;
  readonly webContents: Electron.WebContents;
}

export interface WebSocketTransportAdapter extends TransportAdapter {
  readonly type: 'websocket';
  readonly url: string;
  reconnect(): void;
  getBackoffDelay(): number;
}

export interface StandaloneTransportAdapter extends TransportAdapter {
  readonly type: 'standalone';
  readonly emitter: EventEmitter;
}

export interface BridgeDependencies {
  conversationService: unknown;
  agentRegistry: unknown;
  workerTaskManager: unknown;
  database: unknown;
  [key: string]: unknown;
}

export interface BridgeModule {
  name: string;
  providers: Map<string, ProviderContract>;
  emitters: Map<string, EmitterContract>;
  initialize(deps: BridgeDependencies): Promise<void>;
  destroy(): void;
}

export const MAX_IPC_PAYLOAD_SIZE = 50 * 1024 * 1024;

export function validatePayloadSize(payload: TEmitterPayload): boolean {
  try {
    const size = JSON.stringify(payload).length;
    return size <= MAX_IPC_PAYLOAD_SIZE;
  } catch {
    return false;
  }
}

export function createExponentialBackoff(baseDelay = 500, maxDelay = 8000): () => number {
  let attempt = 0;
  return (): number => {
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    attempt++;
    return delay;
  };
}

export function createBackoffReset(): () => void {
  let attempt = 0;
  return (): void => {
    attempt = 0;
  };
}

export interface IpcError {
  code: string;
  reason: string;
  size?: number;
  timestamp: number;
}

export function createIpcError(code: string, reason: string, size?: number): IpcError {
  return { code, reason, size, timestamp: Date.now() };
}

export const IPC_ERROR_CODES = {
  PAYLOAD_TOO_LARGE: 'payload_too_large',
  TRANSPORT_DISCONNECTED: 'transport_disconnected',
  HANDLER_NOT_FOUND: 'handler_not_found',
  SERIALIZATION_ERROR: 'serialization_error',
  AUTH_EXPIRED: 'auth_expired',
} as const;

export function createPayloadTooLargeError(size: number): IpcError {
  return createIpcError(IPC_ERROR_CODES.PAYLOAD_TOO_LARGE, `Payload size ${size} exceeds ${MAX_IPC_PAYLOAD_SIZE} bytes`, size);
}

export function createHandlerNotFoundError(handlerName: string): IpcError {
  return createIpcError(IPC_ERROR_CODES.HANDLER_NOT_FOUND, `Handler ${handlerName} not found`);
}

export function createSerializationError(error: unknown): IpcError {
  return createIpcError(IPC_ERROR_CODES.SERIALIZATION_ERROR, String(error));
}

export function createAuthExpiredError(): IpcError {
  return createIpcError(IPC_ERROR_CODES.AUTH_EXPIRED, 'Authentication expired');
}