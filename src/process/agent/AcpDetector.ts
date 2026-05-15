import { AgentBackend } from './types';

export class AcpDetector {
  private static readonly CLI_NAME = 'acp';

  async detect(cliPath?: string): Promise<AgentBackend | null> {
    if (cliPath) {
      return {
        kind: 'acp',
        name: 'acp',
        available: true,
        cliPath
      };
    }

    try {
      const { execSync } = await import('child_process');
      const platform = process.platform;

      if (platform === 'win32') {
        execSync(`where ${AcpDetector.CLI_NAME}`, { stdio: 'pipe' });
      } else {
        execSync(`command -v ${AcpDetector.CLI_NAME}`, { stdio: 'pipe' });
      }

      return {
        kind: 'acp',
        name: 'acp',
        available: true
      };
    } catch {
      return null;
    }
  }
}