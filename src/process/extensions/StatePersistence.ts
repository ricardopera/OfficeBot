import { writeFileSync, renameSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

const DEBOUNCE_MS = 500;

interface PersistedState {
  extensions: Record<string, {
    name: string;
    version: string;
    enabled: boolean;
    installedAt: number;
    lastActivatedAt: number | null;
  }>;
  updatedAt: string;
}

export class StatePersistence {
  private statePath: string;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingState: PersistedState | null = null;

  constructor(statePath: string) {
    this.statePath = statePath;
  }

  async load(): Promise<PersistedState['extensions']> {
    if (!existsSync(this.statePath)) {
      return {};
    }

    try {
      const content = readFileSync(this.statePath, 'utf-8');
      const parsed: PersistedState = JSON.parse(content);
      return parsed.extensions ?? {};
    } catch {
      return {};
    }
  }

  async save(extensions: PersistedState['extensions']): Promise<void> {
    this.pendingState = {
      extensions,
      updatedAt: new Date().toISOString(),
    };

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    return new Promise((resolve) => {
      this.debounceTimer = setTimeout(() => {
        this.flush();
        resolve();
      }, DEBOUNCE_MS);
    });
  }

  private flush(): void {
    if (!this.pendingState) return;

    const tmpPath = `${this.statePath}.tmp.${randomUUID()}`;
    writeFileSync(tmpPath, JSON.stringify(this.pendingState, null, 2), 'utf-8');
    renameSync(tmpPath, this.statePath);
    this.pendingState = null;
  }

  isFirstInstall(currentVersion: string, persistedVersion: string | null): boolean {
    if (!persistedVersion) return true;

    const [currMajor, currMinor, currPatch] = currentVersion.split('.').map(Number);
    const [prevMajor, prevMinor, prevPatch] = (persistedVersion ?? '0.0.0').split('.').map(Number);

    return currMajor !== prevMajor || currMinor !== prevMinor || currPatch !== prevPatch;
  }
}