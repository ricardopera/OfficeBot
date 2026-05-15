import { ExtensionStatus } from '../ExtensionManifest.js';

const STATUS_PRIORITY: Record<ExtensionStatus, number> = {
  transient_error: 4,
  persistent_error: 3,
  loaded: 2,
  detected: 1,
  not_installed: 0,
};

interface HubExtensionEntry {
  name: string;
  status: ExtensionStatus;
  version?: string;
  error?: string;
  lastChecked?: string;
}

export class HubStateManager {
  private states: Map<string, HubExtensionEntry> = new Map();

  getStatus(name: string): ExtensionStatus {
    const entry = this.states.get(name);
    if (!entry) return 'not_installed';

    return entry.status;
  }

  setStatus(name: string, status: ExtensionStatus, version?: string, error?: string): void {
    const current = this.states.get(name);
    const currentPriority = current ? STATUS_PRIORITY[current.status] : -1;
    const newPriority = STATUS_PRIORITY[status];

    if (newPriority < currentPriority) {
      return;
    }

    this.states.set(name, {
      name,
      status,
      version,
      error,
      lastChecked: new Date().toISOString(),
    });
  }

  deriveStatus(transientError?: string, persistentError?: string, isLoaded?: boolean, isDetected?: boolean): ExtensionStatus {
    if (transientError) return 'transient_error';
    if (persistentError) return 'persistent_error';
    if (isLoaded) return 'loaded';
    if (isDetected) return 'detected';
    return 'not_installed';
  }

  getAll(): HubExtensionEntry[] {
    return Array.from(this.states.values());
  }

  clear(): void {
    this.states.clear();
  }
}