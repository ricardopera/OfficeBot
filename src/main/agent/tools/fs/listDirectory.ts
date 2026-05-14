import { tool } from 'ai';
import { z } from 'zod';
import { readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { sanitizePath } from '../../../services/FileSystem';

export function createListDirectoryTool(workspacePath: string) {
  return tool({
    description: 'Lista o conteúdo de um diretório com metadados.',
    parameters: z.object({
      dirPath: z.string().describe('Caminho relativo ao workspace (use "." para o workspace raiz)'),
      recursive: z.boolean().optional().describe('Listar recursivamente (padrão: false)'),
    }),
    execute: async ({ dirPath, recursive = false }) => {
      const safePath = sanitizePath(workspacePath, dirPath);

      function listDir(dir: string, depth = 0): object[] {
        const entries = readdirSync(dir, { withFileTypes: true });
        return entries.map((entry) => {
          const fullPath = join(dir, entry.name);
          const rel = relative(workspacePath, fullPath);
          const stat = statSync(fullPath);
          const item: Record<string, unknown> = {
            name: entry.name,
            path: rel,
            type: entry.isDirectory() ? 'directory' : 'file',
            size: stat.size,
            modified: stat.mtimeMs,
          };
          if (recursive && entry.isDirectory() && depth < 5) {
            item.children = listDir(fullPath, depth + 1);
          }
          return item;
        });
      }

      const entries = listDir(safePath);
      return { path: dirPath, entries, count: entries.length };
    },
  });
}
