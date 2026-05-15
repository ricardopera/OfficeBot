import { watch, FSWatcher } from 'fs';
import { ExtensionRegistry } from '../ExtensionRegistry.js';

const HOT_RELOAD_DEBOUNCE_MS = 1000;

export class ExtensionWatcher {
  private watcher: FSWatcher | null = null;
  private registry: ExtensionRegistry;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private watchedDirs: Set<string> = new Set();

  constructor(registry: ExtensionRegistry) {
    this.registry = registry;
  }

  watch(directories: string[]): void {
    for (const dir of directories) {
      if (this.watchedDirs.has(dir)) continue;
      this.watchedDirs.add(dir);

      this.watcher = watch(dir, { recursive: true }, (eventType, filename) => {
        if (filename?.endsWith('aion-extension.json')) {
          this.debouncedReload();
        }
      });
    }
  }

  private debouncedReload(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(async () => {
      await this.performReload();
    }, HOT_RELOAD_DEBOUNCE_MS);
  }

  private async performReload(): Promise<void> {
    this.registry.emit('hot-reload:start');

    try {
      await this.registry.initialize();
      this.registry.emit('hot-reload:complete');
    } catch (error) {
      this.registry.emit('hot-reload:error', error);
    }
  }

  stop(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    this.watchedDirs.clear();
  }
}