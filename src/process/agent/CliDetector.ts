import { ICliDetector } from './types';

export class CliDetector implements ICliDetector {
  private static readonly CLI_NAME_REGEX = /^[a-zA-Z0-9_.-]+$/;

  async exists(cliName: string): Promise<boolean> {
    if (!this.sanitize(cliName)) {
      return false;
    }

    const platform = process.platform;
    
    if (platform === 'win32') {
      return this.existsWindows(cliName);
    }
    return this.existsPosix(cliName);
  }

  private async existsPosix(cliName: string): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync(`command -v "${cliName}"`, { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  private async existsWindows(cliName: string): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync(`where "${cliName}"`, { stdio: 'pipe', shell: 'cmd.exe' });
      return true;
    } catch {
      return this.existsWindowsPowerShell(cliName);
    }
  }

  private async existsWindowsPowerShell(cliName: string): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync(
        `powershell -Command "Get-Command ${cliName} -ErrorAction SilentlyContinue | Test-Path"`,
        { stdio: 'pipe' }
      );
      return true;
    } catch {
      return false;
    }
  }

  sanitize(cliName: string): boolean {
    return CliDetector.CLI_NAME_REGEX.test(cliName);
  }
}