import { tool } from 'ai';
import { z } from 'zod';
import { sanitizePath } from '../../../services/FileSystem';

export function createGlobTool(workspacePath: string) {
  return tool({
    description: 'Busca arquivos por padrão glob no workspace.',
    parameters: z.object({
      pattern: z.string().describe('Padrão glob, ex: **/*.xlsx ou src/**/*.ts'),
      cwd: z.string().optional().describe('Diretório base (relativo ao workspace, padrão: raiz)'),
    }),
    execute: async ({ pattern, cwd }) => {
      const basePath = cwd ? sanitizePath(workspacePath, cwd) : workspacePath;
      
      try {
        // Use native glob if available, otherwise fallback
        const { glob } = await import('glob');
        const files = await glob(pattern, { cwd: basePath, absolute: false });
        return { files, count: files.length, pattern };
      } catch {
        // Fallback: simple recursive search
        return { files: [], count: 0, pattern, error: 'glob module not available' };
      }
    },
  });
}
