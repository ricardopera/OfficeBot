import { tool } from 'ai';
import { z } from 'zod';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { sanitizePath } from '../../../services/FileSystem';
import type { ApprovalEngine } from '../../ApprovalEngine';

export function createWriteFileTool(workspacePath: string, approval: ApprovalEngine) {
  return tool({
    description: 'Cria ou sobrescreve um arquivo no workspace.',
    parameters: z.object({
      filePath: z.string().describe('Caminho relativo ao workspace'),
      content: z.string().describe('Conteúdo a escrever no arquivo'),
    }),
    execute: async ({ filePath, content }) => {
      const approved = await approval.requestApproval('writeFile', { filePath, contentLength: content.length });
      if (!approved) return { success: false, reason: 'Rejeitado pelo usuário' };

      const safePath = sanitizePath(workspacePath, filePath);
      mkdirSync(dirname(safePath), { recursive: true });
      writeFileSync(safePath, content, 'utf-8');
      return { success: true, path: filePath, bytesWritten: Buffer.byteLength(content, 'utf-8') };
    },
  });
}
