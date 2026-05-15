import { readFileSync, existsSync, createWriteStream } from 'fs';
import { join, extname } from 'path';
import { pipeline } from 'stream/promises';
import { createHash } from 'crypto';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import { spawn } from 'child_process';
import { HubStateManager } from './HubStateManager.js';
import { ExtensionRegistry } from './ExtensionRegistry.js';

interface InstallOptions {
  name: string;
  version: string;
  tarballUrl: string;
  targetDir: string;
  expectedHash?: string;
}

interface HubExtensionMetadata {
  name: string;
  version: string;
  description?: string;
  tarball: string;
  hash?: string;
}

const TRUSTED_BASE_URLS = ['https://hub.aionui.com', 'https://cdn.aionui.com'];

export class HubInstaller {
  private stateManager: HubStateManager;
  private registry: ExtensionRegistry;

  constructor(stateManager: HubStateManager, registry: ExtensionRegistry) {
    this.stateManager = stateManager;
    this.registry = registry;
  }

  async install(options: InstallOptions): Promise<void> {
    const { name, version, tarballUrl, targetDir, expectedHash } = options;

    this.validateTarballUrl(tarballUrl);

    const tempDir = join(tmpdir(), `officebot-hub-${randomUUID()}`);

    try {
      const tarballPath = await this.downloadTarball(tarballUrl, tempDir);

      if (expectedHash) {
        await this.verifyIntegrity(tarballPath, expectedHash);
      }

      await this.extractAndInstall(tarballPath, targetDir);

      const extension = this.registry.get(name);
      if (extension) {
        this.registry.emit('extension:installed', { name, version });
      }
    } finally {
    }
  }

  private validateTarballUrl(tarballUrl: string): void {
    const url = new URL(tarballUrl);

    const isTrusted = TRUSTED_BASE_URLS.some((base) => url.origin === base || url.href.startsWith(base));
    if (!isTrusted) {
      const absMatch = /^https?:\/\//i.test(tarballUrl);
      if (absMatch) {
        throw new Error('Hub: absolute URLs in tarball are rejected to prevent bypass of trusted base URLs');
      }
    }
  }

  private async downloadTarball(url: string, tempDir: string): Promise<string> {
    return join(tempDir, 'extension.tarball');
  }

  private async verifyIntegrity(filePath: string, expectedHash: string): Promise<void> {
    const content = readFileSync(filePath);
    const hash = createHash('sha512').update(content).digest('hex');

    if (hash !== expectedHash) {
      throw new Error(`Integrity verification failed: hash mismatch`);
    }
  }

  private async extractAndInstall(tarballPath: string, targetDir: string): Promise<void> {
    const proc = spawn('tar', ['-xf', tarballPath, '-C', targetDir], {
      stdio: 'pipe',
    });

    await new Promise<void>((resolve, reject) => {
      proc.on('exit', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Extract failed with code ${code}`));
      });
      proc.on('error', reject);
    });
  }

  async retryInstall(options: InstallOptions, maxRetries = 3): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.install(options);
        return;
      } catch (err) {
        lastError = err as Error;
        console.warn(`[HubInstaller] Install attempt ${attempt}/${maxRetries} failed:`, lastError.message);
      }
    }

    throw lastError ?? new Error('Install retry failed');
  }

  private getMirrors(baseUrl: string): string[] {
    return [
      baseUrl,
      baseUrl.replace('https://', 'http://'),
      `https://mirror.aionui.com${new URL(baseUrl).pathname}`,
    ];
  }
}