import { tool } from 'ai';
import { z } from 'zod';
import { readFileSync } from 'fs';
import { sanitizePath } from '../../../services/FileSystem';

export function createReadPDFTool(workspacePath: string) {
  return tool({
    description: 'Extrai texto de um arquivo PDF.',
    parameters: z.object({
      filePath: z.string().describe('Caminho relativo ao workspace (.pdf)'),
    }),
    execute: async ({ filePath }) => {
      const safePath = sanitizePath(workspacePath, filePath);
      const dataBuffer = readFileSync(safePath);
      
      try {
        const pdfParse = await import('pdf-parse');
        const data = await pdfParse.default(dataBuffer);
        return {
          success: true,
          text: data.text.slice(0, 50000), // limit output
          pages: data.numpages,
          info: data.info,
        };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
  });
}
