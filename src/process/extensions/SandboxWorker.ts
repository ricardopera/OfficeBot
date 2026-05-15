import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { join } from 'path';
import { randomUUID } from 'crypto';

const INIT_TIMEOUT = 10_000;
const CALL_TIMEOUT = 30_000;

type ApiCall = {
  id: string;
  method: string;
  params?: unknown[];
};

interface SandboxOptions {
  extensionDir: string;
  permissions: {
    storage?: boolean;
    network?: boolean | { allowedDomains: string[] };
    filesystem?: 'extension-only' | 'workspace' | 'full';
  };
}

export class SandboxWorker {
  private worker: Worker | null = null;
  private extensionDir: string;
  private permissions: SandboxOptions['permissions'];
  private pendingCalls: Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }> = new Map();

  constructor(options: SandboxOptions) {
    this.extensionDir = options.extensionDir;
    this.permissions = options.permissions;
  }

  async initialize(): Promise<void> {
    if (!isMainThread) return;

    const workerPath = join(__dirname, 'sandbox', 'sandboxWorker.js');
    this.worker = new Worker(workerPath, {
      workerData: {
        extensionDir: this.extensionDir,
        permissions: this.permissions,
      },
    });

    this.worker.on('message', (msg) => {
      if (msg.type === 'api-call') {
        this.handleApiCall(msg as ApiCall);
      }
    });

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Sandbox initialization timeout after ${INIT_TIMEOUT}ms`));
      }, INIT_TIMEOUT);

      this.worker!.on('message', (msg) => {
        if (msg.type === 'init-complete') {
          clearTimeout(timer);
          resolve();
        }
        if (msg.type === 'init-error') {
          clearTimeout(timer);
          reject(new Error(msg.error));
        }
      });
    });
  }

  async call(method: string, params?: unknown[]): Promise<unknown> {
    if (!this.worker) throw new Error('Sandbox not initialized');

    return new Promise((resolve, reject) => {
      const id = randomUUID();
      const timer = setTimeout(() => {
        this.pendingCalls.delete(id);
        reject(new Error(`Sandbox call timeout after ${CALL_TIMEOUT}ms`));
      }, CALL_TIMEOUT);

      this.pendingCalls.set(id, { resolve, reject });

      this.worker!.postMessage({ type: 'api-call', id, method, params } as ApiCall);
    });
  }

  private handleApiCall(msg: ApiCall): void {
    const { id, method, params } = msg;

    if (method === 'storage.get' && !this.permissions.storage) {
      this.sendResponse(id, null, new Error('Permission denied: storage access requires storage:true in manifest'));
      return;
    }

    this.sendResponse(id, null, new Error(`Unknown method: ${method}`));
  }

  private sendResponse(id: string, result: unknown, error: Error | null): void {
    this.worker?.postMessage({ type: 'api-response', id, result, error: error?.message ?? null });
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

export function createSandbox(options: SandboxOptions): SandboxWorker {
  return new SandboxWorker(options);
}