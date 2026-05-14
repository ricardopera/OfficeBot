import { resolve, isAbsolute, normalize, sep } from 'path';
import { existsSync, statSync } from 'fs';

/**
 * Safely resolve a user-provided path against a workspace root.
 * Throws if the resolved path is outside the workspace.
 * Works correctly on both Windows (backslash) and POSIX (forward slash).
 */
export function sanitizePath(workspacePath: string, userPath: string): string {
  // Resolve the path using Node's path module so the OS separator is applied
  const resolved = isAbsolute(userPath)
    ? normalize(userPath)
    : resolve(workspacePath, userPath);

  const normalizedWorkspace = normalize(workspacePath);

  // Append the OS-specific separator so a sibling dir like "/workspaceFoo"
  // is never mistaken for being inside "/workspace".
  const workspacePrefix = normalizedWorkspace.endsWith(sep)
    ? normalizedWorkspace
    : normalizedWorkspace + sep;

  if (resolved !== normalizedWorkspace && !resolved.startsWith(workspacePrefix)) {
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
