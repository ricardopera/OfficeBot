import { resolve, isAbsolute, normalize } from 'path';
import { existsSync, statSync } from 'fs';

/**
 * Safely resolve a user-provided path against a workspace root.
 * Throws if the resolved path is outside the workspace.
 */
export function sanitizePath(workspacePath: string, userPath: string): string {
  // Resolve the path
  const resolved = isAbsolute(userPath)
    ? normalize(userPath)
    : resolve(workspacePath, userPath);

  // Ensure it's within the workspace
  const normalizedWorkspace = normalize(workspacePath);
  if (!resolved.startsWith(normalizedWorkspace + '/') && 
      !resolved.startsWith(normalizedWorkspace + '\\') && 
      resolved !== normalizedWorkspace) {
    throw new Error(`Acesso negado: caminho fora do workspace: ${userPath}`);
  }

  return resolved;
}

export class FileSystemService {
  constructor(private workspacePath: string) {}

  sanitize(userPath: string): string {
    return sanitizePath(this.workspacePath, userPath);
  }

  exists(userPath: string): boolean {
    try {
      const safe = this.sanitize(userPath);
      return existsSync(safe);
    } catch {
      return false;
    }
  }

  isDirectory(userPath: string): boolean {
    try {
      const safe = this.sanitize(userPath);
      return statSync(safe).isDirectory();
    } catch {
      return false;
    }
  }
}
