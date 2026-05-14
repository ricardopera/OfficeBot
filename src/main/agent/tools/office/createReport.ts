import { tool } from 'ai';
import { z } from 'zod';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { sanitizePath } from '../../../services/FileSystem';
import type { ApprovalEngine } from '../../ApprovalEngine';

const htmlTemplate = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= title %></title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; color: #222; }
    h1 { border-bottom: 2px solid #4f8ef7; padding-bottom: 8px; }
    h2 { color: #2a5ca8; margin-top: 2rem; }
    section { margin-bottom: 2rem; }
    pre { background: #f5f5f5; padding: 12px; border-radius: 6px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1><%= title %></h1>
  <% sections.forEach(function(section) { %>
  <section>
    <h2><%= section.heading %></h2>
    <div><%- section.content %></div>
  </section>
  <% }); %>
</body>
</html>`;

const markdownTemplate = `# <%= title %>

<% sections.forEach(function(section) { %>
## <%= section.heading %>

<%- section.content %>

<% }); %>`;

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
      if (!approved) return { success: false, reason: 'Rejected by user' };

      const safePath = sanitizePath(workspacePath, outputPath);
      mkdirSync(dirname(safePath), { recursive: true });

      try {
        let ejs: typeof import('ejs');
        try {
          ejs = await import('ejs');
        } catch {
          return { success: false, error: 'EJS package not found. Run: npm install ejs' };
        }
        const template = format === 'html' ? htmlTemplate : markdownTemplate;
        const content = ejs.render(template, { title, sections });
        writeFileSync(safePath, content, 'utf-8');
        return { success: true, path: outputPath, format, bytesWritten: Buffer.byteLength(content, 'utf-8') };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
  });
}
