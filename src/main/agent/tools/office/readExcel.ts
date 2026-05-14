import { tool } from 'ai';
import { z } from 'zod';
import ExcelJS from 'exceljs';
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
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(safePath);

      const worksheet = sheetName
        ? workbook.getWorksheet(sheetName)
        : workbook.worksheets[0];

      if (!worksheet) {
        return { success: false, error: `Aba "${sheetName}" não encontrada` };
      }

      const sheetNames = workbook.worksheets.map((ws) => ws.name);
      const allRows: unknown[][] = [];

      worksheet.eachRow({ includeEmpty: true }, (row) => {
        if (allRows.length < maxRows) {
          allRows.push(row.values.slice(1) as unknown[]); // ExcelJS row.values is 1-indexed; slice(1) drops the leading undefined at index 0
        }
      });

      const headers = allRows[0] ?? [];
      const rows = allRows.slice(1);

      return {
        success: true,
        sheetName: worksheet.name,
        sheets: sheetNames,
        headers,
        rows,
        totalRows: worksheet.rowCount,
        returned: allRows.length,
      };
    },
  });
}
