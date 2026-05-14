import { tool } from 'ai';
import { z } from 'zod';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { sanitizePath } from '../../../services/FileSystem';
import type { ApprovalEngine } from '../../ApprovalEngine';

export function createGenerateChartTool(workspacePath: string, approval: ApprovalEngine) {
  return tool({
    description: 'Gera um gráfico como imagem PNG a partir de dados.',
    parameters: z.object({
      outputPath: z.string().describe('Caminho de saída .png relativo ao workspace'),
      type: z.enum(['bar', 'line', 'pie', 'doughnut', 'scatter']).describe('Tipo de gráfico'),
      title: z.string().optional().describe('Título do gráfico'),
      labels: z.array(z.string()).describe('Rótulos do eixo X / categorias'),
      datasets: z.array(z.object({
        label: z.string(),
        data: z.array(z.number()),
        backgroundColor: z.union([z.string(), z.array(z.string())]).optional(),
        borderColor: z.union([z.string(), z.array(z.string())]).optional(),
      })).describe('Conjuntos de dados'),
      width: z.number().optional().describe('Largura em pixels (padrão: 800)'),
      height: z.number().optional().describe('Altura em pixels (padrão: 500)'),
    }),
    execute: async ({ outputPath, type, title, labels, datasets, width = 800, height = 500 }) => {
      const approved = await approval.requestApproval('generateChart', { outputPath, type });
      if (!approved) return { success: false, reason: 'Rejeitado pelo usuário' };

      const safePath = sanitizePath(workspacePath, outputPath);
      mkdirSync(dirname(safePath), { recursive: true });

      try {
        const { ChartJSNodeCanvas } = await import('chartjs-node-canvas');
        const chartCanvas = new ChartJSNodeCanvas({ width, height });

        const imageBuffer = await chartCanvas.renderToBuffer({
          type,
          data: {
            labels,
            datasets: datasets.map((ds) => ({
              ...ds,
              backgroundColor: ds.backgroundColor ?? 'rgba(59,130,246,0.5)',
              borderColor: ds.borderColor ?? 'rgba(59,130,246,1)',
            })),
          },
          options: {
            plugins: {
              title: { display: !!title, text: title },
            },
          },
        });

        writeFileSync(safePath, imageBuffer);
        return { success: true, path: outputPath, width, height, type };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
  });
}
