import { tool } from 'ai';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { sanitizePath } from '../../../services/FileSystem';

export function createReadExcelTool(workspacePath: string) {
  return tool({
    description: 'Lê uma planilha Excel (.xlsx, .xls, .csv) e retorna os dados estruturados.',
    parameters: z.object({
      filePath: z.string().describe('Caminho relativo ao workspace'),
      sheetName: z.string().optional().describe('Nome da aba (padrão: primeira aba)'),
      maxRows: z.number().optional().describe('Máximo de linhas a retornar (padrão: 1000)'),
    }),
    execute: async ({ filePath, sheetName, maxRows = 1000 }) => {
      const safePath = sanitizePath(workspacePath, filePath);
      const workbook = XLSX.readFile(safePath);

      const sheet = sheetName
        ? workbook.Sheets[sheetName]
        : workbook.Sheets[workbook.SheetNames[0]];

      if (!sheet) {
        return { success: false, error: `Aba "${sheetName}" não encontrada` };
      }

      const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const limited = rows.slice(0, maxRows);

      return {
        success: true,
        sheetName: sheetName ?? workbook.SheetNames[0],
        sheets: workbook.SheetNames,
        headers: limited[0] ?? [],
        rows: limited.slice(1),
        totalRows: rows.length,
        returned: limited.length,
      };
    },
  });
}
