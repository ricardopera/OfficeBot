import { tool } from 'ai';
import { z } from 'zod';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { sanitizePath } from '../../../services/FileSystem';
import type { ApprovalEngine } from '../../ApprovalEngine';

export function createCreateReportTool(workspacePath: string, approval: ApprovalEngine) {
  return tool({
    description: 'Gera um relatório em formato Markdown ou HTML a partir de dados e template.',
    parameters: z.object({
      outputPath: z.string().describe('Caminho de saída relativo ao workspace'),
      title: z.string().describe('Título do relatório'),
      sections: z.array(z.object({
        heading: z.string(),
        content: z.string(),
      })).describe('Seções do relatório'),
      format: z.enum(['markdown', 'html']).optional().describe('Formato de saída (padrão: markdown)'),
    }),
    execute: async ({ outputPath, title, sections, format = 'markdown' }) => {
      const approved = await approval.requestApproval('createReport', { outputPath, title });
      if (!approved) return { success: false, reason: 'Rejeitado pelo usuário' };

      const safePath = sanitizePath(workspacePath, outputPath);
      mkdirSync(dirname(safePath), { recursive: true });

      let content: string;
      if (format === 'html') {
        content = `<!DOCTYPE html>\n<html lang="pt-BR">\n<head><meta charset="UTF-8"><title>${title}</title></head>\n<body>\n<h1>${title}</h1>\n`;
        for (const section of sections) {
          content += `<h2>${section.heading}</h2>\n<div>${section.content}</div>\n`;
        }
        content += '</body>\n</html>';
      } else {
        content = `# ${title}\n\n`;
        for (const section of sections) {
          content += `## ${section.heading}\n\n${section.content}\n\n`;
        }
      }

      writeFileSync(safePath, content, 'utf-8');
      return { success: true, path: outputPath, format, bytesWritten: Buffer.byteLength(content, 'utf-8') };
    },
  });
}
