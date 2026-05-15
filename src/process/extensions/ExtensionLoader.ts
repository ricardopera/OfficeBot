import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import {
  ExtensionManifestSchema,
  LoadedExtension,
  ExtensionManifest,
} from './ExtensionManifest.js';

export class ExtensionLoader {
  private scanDirectories: string[] = [];

  constructor(scanDirectories: string[] = []) {
    this.scanDirectories = scanDirectories;
  }

  addScanDirectory(dir: string): void {
    this.scanDirectories.push(dir);
  }

  async loadAll(): Promise<LoadedExtension[]> {
    const extensions: LoadedExtension[] = [];

    for (const dir of this.scanDirectories) {
      if (!existsSync(dir)) continue;

      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const manifestPath = join(dir, entry.name, 'aion-extension.json');
        if (!existsSync(manifestPath)) continue;

        try {
          const extension = this.loadFromPath(dir, entry.name);
          if (extension) {
            extensions.push(extension);
          }
        } catch (error) {
          console.warn(`[ExtensionLoader] Failed to load extension in ${manifestPath}:`, error);
        }
      }
    }

    return extensions;
  }

  loadFromPath(baseDir: string, extensionDir: string): LoadedExtension | null {
    const manifestPath = join(baseDir, extensionDir, 'aion-extension.json');
    const rawContent = readFileSync(manifestPath, 'utf-8');
    const parsed = JSON.parse(rawContent);

    const result = ExtensionManifestSchema.safeParse(parsed);
    if (!result.success) {
      const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      throw new Error(`Invalid manifest at ${manifestPath}: ${errors}`);
    }

    return {
      manifest: result.data,
      directory: resolve(baseDir, extensionDir),
      loadedAt: Date.now(),
    };
  }

  parseManifest(content: string): ExtensionManifest {
    const parsed = JSON.parse(content);
    const result = ExtensionManifestSchema.safeParse(parsed);
    if (!result.success) {
      throw new Error(`Manifest validation failed: ${result.error.message}`);
    }
    return result.data;
  }

  validateManifest(manifest: unknown): ExtensionManifest {
    const result = ExtensionManifestSchema.safeParse(manifest);
    if (!result.success) {
      throw new Error(`Manifest validation failed: ${result.error.message}`);
    }
    return result.data;
  }
}