import { tool } from 'ai';
import { z } from 'zod';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { sanitizePath } from '../../../services/FileSystem';

function grepDir(
  dir: string,
  pattern: RegExp,
  results: { file: string; line: number; content: string }[]
): void {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
        grepDir(fullPath, pattern, results);
      }
    } else {
      const ext = extname(entry.name).toLowerCase();
      const textExts = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.txt', '.csv', '.py', '.java', '.cs', '.html', '.css', '.yaml', '.yml'];
      if (textExts.includes(ext)) {
        try {
          const content = readFileSync(fullPath, 'utf-8');
          const lines = content.split('\n');
          lines.forEach((line, i) => {
            if (pattern.test(line)) {
              results.push({ file: fullPath, line: i + 1, content: line.trim() });
            }
          });
        } catch {
          // Skip unreadable files
        }
      }
    }
  }
}

export function createGrepTool(workspacePath: string) {
  return tool({
    description: 'Busca texto por expressão regular nos arquivos do workspace.',
    parameters: z.object({
      pattern: z.string().describe('Expressão regular para buscar'),
      path: z.string().optional().describe('Caminho relativo ao workspace para limitar a busca'),
      caseInsensitive: z.boolean().optional().describe('Ignorar maiúsculas/minúsculas (padrão: false)'),
    }),
    execute: async ({ pattern, path, caseInsensitive }) => {
      const searchPath = path ? sanitizePath(workspacePath, path) : workspacePath;
      const flags = caseInsensitive ? 'i' : '';
      const regex = new RegExp(pattern, flags);

      const results: { file: string; line: number; content: string }[] = [];
      const stat = statSync(searchPath);

      if (stat.isDirectory()) {
        grepDir(searchPath, regex, results);
      } else {
        const content = readFileSync(searchPath, 'utf-8');
        content.split('\n').forEach((line, i) => {
          if (regex.test(line)) {
            results.push({ file: searchPath, line: i + 1, content: line.trim() });
          }
        });
      }

      // Return relative paths
      const relResults = results.map((r) => ({
        ...r,
        file: r.file.replace(workspacePath + '/', '').replace(workspacePath + '\\', ''),
      }));

      return { results: relResults.slice(0, 200), total: relResults.length, pattern };
    },
  });
}
