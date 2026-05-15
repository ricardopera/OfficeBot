import { EventEmitter } from 'events';
import {
  LoadedExtension,
  ExtensionState,
  ExtensionError,
  ExtensionStatus,
} from './ExtensionManifest.js';

const ENGINE_VERSION = '1.0.0';

interface RegistryEntry {
  extension: LoadedExtension;
  status: ExtensionStatus;
  error?: ExtensionError;
  state: ExtensionState;
}

export class ExtensionRegistry extends EventEmitter {
  private extensions: Map<string, RegistryEntry> = new Map();
  private loader: import('./ExtensionLoader.js').ExtensionLoader;

  constructor(loader: import('./ExtensionLoader.js').ExtensionLoader) {
    super();
    this.loader = loader;
  }

  async initialize(): Promise<void> {
    const loadedExtensions = await this.loader.loadAll();

    for (const ext of loadedExtensions) {
      this.register(ext);
    }
  }

  register(extension: LoadedExtension): void {
    const { name } = extension.manifest;

    if (this.extensions.has(name)) {
      throw new Error(`Duplicate extension ID rejected: "${name}" already registered`);
    }

    this.checkEngineCompatibility(extension);

    const state: ExtensionState = {
      name,
      version: extension.manifest.version,
      enabled: true,
      installedAt: Date.now(),
      lastActivatedAt: null,
    };

    this.extensions.set(name, {
      extension,
      status: 'loaded',
      state,
    });

    this.emit('extension:registered', { name, extension });
  }

  unregister(name: string): void {
    this.extensions.delete(name);
    this.emit('extension:unregistered', { name });
  }

  get(name: string): LoadedExtension | undefined {
    return this.extensions.get(name)?.extension;
  }

  getAll(): LoadedExtension[] {
    return Array.from(this.extensions.values()).map((e) => e.extension);
  }

  getState(name: string): ExtensionState | undefined {
    return this.extensions.get(name)?.state;
  }

  getStatus(name: string): ExtensionStatus | undefined {
    return this.extensions.get(name)?.status;
  }

  isEnabled(name: string): boolean {
    return this.extensions.get(name)?.state.enabled ?? false;
  }

  enable(name: string): void {
    const entry = this.extensions.get(name);
    if (!entry) throw new Error(`Extension not found: ${name}`);
    entry.state.enabled = true;
    this.emit('extension:enabled', { name });
  }

  disable(name: string): void {
    const entry = this.extensions.get(name);
    if (!entry) throw new Error(`Extension not found: ${name}`);
    entry.state.enabled = false;
    this.emit('extension:disabled', { name });
  }

  private checkEngineCompatibility(extension: LoadedExtension): void {
    const engine = extension.manifest.engine;
    if (!engine) return;

    if (engine.aionui) {
      const [reqMajor] = engine.aionui.split('.').map(Number);
      const [curMajor] = ENGINE_VERSION.split('.').map(Number);
      if (reqMajor > curMajor) {
        throw new Error(
          `Engine compatibility check failed: extension "${extension.manifest.name}" requires aionui ${engine.aionui}, current version is ${ENGINE_VERSION}`
        );
      }
    }

    if (engine.apiVersion) {
      console.warn(`[ExtensionRegistry] API version compatibility not yet implemented for "${extension.manifest.name}"`);
    }
  }

  resolveContributions<T>(type: string): T[] {
    const contributions: T[] = [];

    for (const entry of this.extensions.values()) {
      if (!entry.state.enabled) continue;

      const { contributes } = entry.extension.manifest;
      if (!contributes || !(type in contributes)) continue;

      contributions.push(contributes[type] as T);
    }

    return contributions;
  }

  has(name: string): boolean {
    return this.extensions.has(name);
  }
}