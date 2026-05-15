import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface ExtensionStorageData {
  [key: string]: string;
}

const STORAGE_DIR = join(process.env.APPDATA ?? '', 'officebot', 'extension-storage');

export class ExtensionStorage {
  private extensionName: string;
  private data: ExtensionStorageData = {};
  private storagePath: string;

  constructor(extensionName: string) {
    this.extensionName = extensionName;
    this.storagePath = join(STORAGE_DIR, `${extensionName}.json`);
    this.load();
  }

  private load(): void {
    if (!existsSync(this.storagePath)) {
      this.data = {};
      return;
    }

    try {
      const content = readFileSync(this.storagePath, 'utf-8');
      this.data = JSON.parse(content);
    } catch {
      this.data = {};
    }
  }

  get(key: string): string | null {
    return this.data[key] ?? null;
  }

  set(key: string, value: string): void {
    this.data[key] = value;
    this.save();
  }

  delete(key: string): void {
    delete this.data[key];
    this.save();
  }

  clear(): void {
    this.data = {};
    this.save();
  }

  private save(): void {
    writeFileSync(this.storagePath, JSON.stringify(this.data, null, 2), 'utf-8');
  }
}