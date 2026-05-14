import { tool } from 'ai';
import { z } from 'zod';
import { readFileSync, writeFileSync } from 'fs';
import { sanitizePath } from '../../../services/FileSystem';
import type { ApprovalEngine } from '../../ApprovalEngine';

function buildDiff(original: string, modified: string, oldStr: string, newStr: string): string {
  const lines: string[] = [];
  for (const line of oldStr.split('\n')) lines.push(`- ${line}`);
  for (const line of newStr.split('\n')) lines.push(`+ ${line}`);
  return lines.join('\n');
}

export function createEditFileTool(workspacePath: string, approval: ApprovalEngine) {
  return tool({
    description: 'Substitui uma string exata em um arquivo (edição cirúrgica). Prefira este ao writeFile para edições parciais.',
    parameters: z.object({
      filePath: z.string().describe('Caminho relativo ao workspace'),
      oldStr: z.string().describe('String exata a substituir (deve existir exatamente uma vez no arquivo)'),
      newStr: z.string().describe('Nova string que substituirá oldStr'),
    }),
    execute: async ({ filePath, oldStr, newStr }) => {
      const safePath = sanitizePath(workspacePath, filePath);
      const original = readFileSync(safePath, 'utf-8');

      const count = (original.split(oldStr).length - 1);
      if (count === 0) {
        return { success: false, reason: 'String não encontrada no arquivo' };
      }
      if (count > 1) {
        return { success: false, reason: `String encontrada ${count} vezes. Use uma string mais específica.` };
      }

      const diff = buildDiff(original, original.replace(oldStr, newStr), oldStr, newStr);
      const approved = await approval.requestApproval('editFile', { filePath, oldStr, newStr }, diff);
      if (!approved) return { success: false, reason: 'Rejeitado pelo usuário' };

      const modified = original.replace(oldStr, newStr);
      writeFileSync(safePath, modified, 'utf-8');
      return { success: true, path: filePath, diff };
    },
  });
}
