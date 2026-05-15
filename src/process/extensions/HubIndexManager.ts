import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface HubIndexEntry {
  name: string;
  version: string;
  description?: string;
  tarball: string;
  hash?: string;
  lastUpdated?: string;
}

interface HubIndex {
  version: string;
  extensions: HubIndexEntry[];
  generatedAt: string;
}

const BUNDLED_INDEX_PATH = join(process.env.APPDATA ?? '', 'officebot', 'bundled-extensions.json');
const REMOTE_INDEX_URL = 'https://hub.aionui.com/index.json';
const CACHE_TTL_MS = 5 * 60 * 1000;

export class HubIndexManager {
  private localIndex: HubIndex | null = null;
  private remoteIndex: HubIndex | null = null;
  private remoteCacheTime = 0;

  async getIndex(): Promise<HubIndexEntry[]> {
    const [local, remote] = await Promise.all([
      this.loadLocalIndex(),
      this.loadRemoteIndex(),
    ]);

    return this.mergeIndexes(local, remote);
  }

  async search(query: string): Promise<HubIndexEntry[]> {
    const index = await this.getIndex();
    const lower = query.toLowerCase();

    return index.filter(
      (e) =>
        e.name.toLowerCase().includes(lower) ||
        e.description?.toLowerCase().includes(lower)
    );
  }

  async findByName(name: string): Promise<HubIndexEntry | undefined> {
    const index = await this.getIndex();
    return index.find((e) => e.name === name);
  }

  private async loadLocalIndex(): Promise<HubIndexEntry[]> {
    if (!existsSync(BUNDLED_INDEX_PATH)) return [];

    try {
      const content = readFileSync(BUNDLED_INDEX_PATH, 'utf-8');
      const parsed: HubIndex = JSON.parse(content);
      return parsed.extensions ?? [];
    } catch {
      return [];
    }
  }

  private async loadRemoteIndex(): Promise<HubIndexEntry[]> {
    const now = Date.now();
    if (this.remoteIndex && now - this.remoteCacheTime < CACHE_TTL_MS) {
      return this.remoteIndex.extensions ?? [];
    }

    try {
      const response = await fetch(REMOTE_INDEX_URL);
      if (!response.ok) return [];

      const parsed: HubIndex = await response.json();
      this.remoteIndex = parsed;
      this.remoteCacheTime = now;
      return parsed.extensions ?? [];
    } catch {
      return [];
    }
  }

  private mergeIndexes(local: HubIndexEntry[], remote: HubIndexEntry[]): HubIndexEntry[] {
    const merged = new Map<string, HubIndexEntry>();

    for (const ext of local) {
      merged.set(ext.name, ext);
    }

    for (const ext of remote) {
      const existing = merged.get(ext.name);
      if (!existing || ext.version !== existing.version) {
        merged.set(ext.name, ext);
      }
    }

    return Array.from(merged.values());
  }
}