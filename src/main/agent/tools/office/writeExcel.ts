import { tool } from 'ai';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { dirname } from 'path';
import { mkdirSync } from 'fs';
import { sanitizePath } from '../../../services/FileSystem';
import type { ApprovalEngine } from '../../ApprovalEngine';

export function createWriteExcelTool(workspacePath: string, approval: ApprovalEngine) {
  return tool({
    description: 'Cria ou modifica uma planilha Excel com dados fornecidos.',
    parameters: z.object({
      filePath: z.string().describe('Caminho relativo ao workspace'),
      sheetName: z.string().optional().describe('Nome da aba (padrão: Sheet1)'),
      headers: z.array(z.string()).describe('Cabeçalhos das colunas'),
      rows: z.array(z.array(z.unknown())).describe('Linhas de dados'),
    }),
    execute: async ({ filePath, sheetName = 'Sheet1', headers, rows }) => {
      const approved = await approval.requestApproval('writeExcel', { filePath, sheetName, rowCount: rows.length });
      if (!approved) return { success: false, reason: 'Rejeitado pelo usuário' };

      const safePath = sanitizePath(workspacePath, filePath);
      mkdirSync(dirname(safePath), { recursive: true });

      const wb = XLSX.utils.book_new();
      const data = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, safePath);

      return { success: true, path: filePath, rows: rows.length, sheets: [sheetName] };
    },
  });
}
