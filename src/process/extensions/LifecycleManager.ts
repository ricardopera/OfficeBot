import { spawn } from 'child_process';
import { join } from 'path';
import { writeFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { LoadedExtension } from './ExtensionManifest.js';
import { isPathWithinDirectory } from './sandbox/pathSafety.js';

const LIFECYCLE_TIMEOUTS = {
  onInstall: 120_000,
  onActivate: 30_000,
  onDeactivate: 30_000,
  onUninstall: 60_000,
} as const;

type LifecycleHookName = keyof typeof LIFECYCLE_TIMEOUTS;

export class LifecycleManager {
  private registry: import('./ExtensionRegistry.js').ExtensionRegistry;

  constructor(registry: import('./ExtensionRegistry.js').ExtensionRegistry) {
    this.registry = registry;
  }

  async install(extension: LoadedExtension): Promise<void> {
    await this.runHook(extension, 'onInstall');
  }

  async activate(extension: LoadedExtension): Promise<void> {
    await this.runHook(extension, 'onActivate');
  }

  async deactivate(extension: LoadedExtension): Promise<void> {
    await this.runHook(extension, 'onDeactivate');
  }

  async uninstall(extension: LoadedExtension): Promise<void> {
    await this.runHook(extension, 'onUninstall');
  }

  async hotReload(extension: LoadedExtension): Promise<void> {
    await this.deactivate(extension);
    await this.activate(extension);
  }

  private async runHook(
    extension: LoadedExtension,
    hookName: LifecycleHookName
  ): Promise<void> {
    const lifecycle = extension.manifest.lifecycle;
    if (!lifecycle) return;

    const hook = lifecycle[hookName];
    if (!hook) return;

    const hookConfig = this.normalizeHook(hook);
    const timeout = hookConfig.timeout ?? LIFECYCLE_TIMEOUTS[hookName];

    if (hookConfig.script) {
      const scriptPath = join(extension.directory, hookConfig.script);

      if (!isPathWithinDirectory(scriptPath, extension.directory)) {
        throw new Error(
          `Path traversal prevention: hook script "${hookConfig.script}" must be within extension directory`
        );
      }

      if (!existsSync(scriptPath)) {
        throw new Error(`Hook script not found: ${scriptPath}`);
      }

      await this.executeInChildProcess(scriptPath, hookConfig.shell ?? false, timeout);
    }
  }

  private normalizeHook(
    hook: string | { script?: string; shell?: boolean; timeout?: number } | undefined
  ): { script?: string; shell?: boolean; timeout?: number } {
    if (!hook) return {};
    if (typeof hook === 'string') return { script: hook };
    return {
      script: hook.script,
      shell: hook.shell ?? false,
      timeout: hook.timeout,
    };
  }

  private executeInChildProcess(
    scriptPath: string,
    shell: boolean,
    timeout: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const tempToken = randomUUID();
      const tmpFile = join(tmpdir(), `officebot-hook-${tempToken}.json`);
      writeFileSync(tmpFile, JSON.stringify({ script: scriptPath, shell }), 'utf-8');

      const proc = spawn(process.execPath, [scriptPath], {
        stdio: 'pipe',
        timeout,
        shell,
      });

      const timer = setTimeout(() => {
        proc.kill('SIGKILL');
        reject(new Error(`Hook timeout after ${timeout}ms`));
      }, timeout);

      proc.on('exit', (code) => {
        clearTimeout(timer);
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Hook exited with code ${code}`));
        }
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }
}