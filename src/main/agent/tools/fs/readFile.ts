import { tool } from 'ai';
import { z } from 'zod';
import { readFileSync } from 'fs';
import { resolve, isAbsolute } from 'path';
import { sanitizePath } from '../../../services/FileSystem';

export function createReadFileTool(workspacePath: string) {
  return tool({
    description: 'Lê o conteúdo de um arquivo no workspace.',
    parameters: z.object({
      filePath: z.string().describe('Caminho relativo ao workspace'),
      offset: z.number().optional().describe('Linha inicial (0-based)'),
      limit: z.number().optional().describe('Número máximo de linhas a retornar'),
    }),
    execute: async ({ filePath, offset, limit }) => {
      const safePath = sanitizePath(workspacePath, filePath);
      const content = readFileSync(safePath, 'utf-8');
      const lines = content.split('\n');

      const start = offset ?? 0;
      const end = limit !== undefined ? start + limit : lines.length;
      const slice = lines.slice(start, end);

      const numbered = slice.map((line, i) => `${start + i + 1}: ${line}`).join('\n');
      return { content: numbered, totalLines: lines.length, startLine: start + 1, endLine: Math.min(end, lines.length) };
    },
  });
}
