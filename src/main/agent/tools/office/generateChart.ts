import { tool } from 'ai';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import sharp from 'sharp';
import { z } from 'zod';
import type { ApprovalEngine } from '../../ApprovalEngine';
import { sanitizePath } from '../../../services/FileSystem';

type ChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'scatter';

type ChartDataset = {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
};

const DEFAULT_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#06B6D4',
];

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees - 90) * (Math.PI / 180);
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    'Z',
  ].join(' ');
}

function getColor(color: string | string[] | undefined, index: number, fallbackIndex: number): string {
  if (Array.isArray(color)) return color[index] ?? DEFAULT_COLORS[fallbackIndex % DEFAULT_COLORS.length];
  return color ?? DEFAULT_COLORS[fallbackIndex % DEFAULT_COLORS.length];
}

function collectValues(type: ChartType, datasets: ChartDataset[]): number[] {
  if (type === 'pie' || type === 'doughnut') {
    return datasets[0]?.data ?? [];
  }

  return datasets.flatMap((dataset) => dataset.data);
}

function renderCartesianChart(params: {
  type: Extract<ChartType, 'bar' | 'line' | 'scatter'>;
  width: number;
  height: number;
  title?: string;
  labels: string[];
  datasets: ChartDataset[];
}): string {
  const { type, width, height, title, labels, datasets } = params;
  const margin = { top: title ? 72 : 40, right: 32, bottom: 72, left: 64 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const values = collectValues(type, datasets);
  const maxValue = values.length > 0 ? Math.max(...values, 0) : 1;
  const minValue = type === 'scatter' ? Math.min(...values, 0) : 0;
  const range = Math.max(maxValue - minValue, 1);
  const xStep = labels.length > 1 ? chartWidth / (labels.length - 1) : chartWidth;

  const gridLines = Array.from({ length: 5 }, (_, index) => {
    const value = minValue + (range * index) / 4;
    const y = margin.top + chartHeight - ((value - minValue) / range) * chartHeight;
    return `
      <line x1="${margin.left}" y1="${y}" x2="${margin.left + chartWidth}" y2="${y}" stroke="#E5E7EB" stroke-width="1" />
      <text x="${margin.left - 10}" y="${y + 4}" font-size="12" text-anchor="end" fill="#6B7280">${value.toFixed(value % 1 === 0 ? 0 : 1)}</text>
    `;
  }).join('');

  const xAxisLabels = labels.map((label, index) => {
    const x = margin.left + (labels.length === 1 ? chartWidth / 2 : index * xStep);
    return `<text x="${x}" y="${margin.top + chartHeight + 24}" font-size="12" text-anchor="middle" fill="#6B7280">${escapeXml(label)}</text>`;
  }).join('');

  const series = datasets.map((dataset, datasetIndex) => {
    if (type === 'bar') {
      const groupWidth = labels.length > 0 ? chartWidth / labels.length : chartWidth;
      const barWidth = Math.max((groupWidth * 0.7) / Math.max(datasets.length, 1), 10);
      return dataset.data.map((value, valueIndex) => {
        const normalized = (value - minValue) / range;
        const barHeight = normalized * chartHeight;
        const x = margin.left + valueIndex * groupWidth + groupWidth * 0.15 + datasetIndex * barWidth;
        const y = margin.top + chartHeight - barHeight;
        const fill = getColor(dataset.backgroundColor, valueIndex, datasetIndex + valueIndex);
        return `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="4" fill="${fill}" />`;
      }).join('');
    }

    const points = dataset.data.map((value, valueIndex) => {
      const x = margin.left + (labels.length === 1 ? chartWidth / 2 : valueIndex * xStep);
      const y = margin.top + chartHeight - ((value - minValue) / range) * chartHeight;
      return { x, y };
    });

    if (type === 'line') {
      const stroke = getColor(dataset.borderColor ?? dataset.backgroundColor, 0, datasetIndex);
      const polyline = points.map((point) => `${point.x},${point.y}`).join(' ');
      const circles = points
        .map(
          (point, pointIndex) =>
            `<circle cx="${point.x}" cy="${point.y}" r="4" fill="${getColor(dataset.backgroundColor, pointIndex, datasetIndex)}" />`
        )
        .join('');
      return `<polyline fill="none" stroke="${stroke}" stroke-width="3" points="${polyline}" />${circles}`;
    }

    return points
      .map(
        (point, pointIndex) =>
          `<circle cx="${point.x}" cy="${point.y}" r="5" fill="${getColor(dataset.backgroundColor, pointIndex, datasetIndex)}" />`
      )
      .join('');
  }).join('');

  const legend = datasets.map((dataset, datasetIndex) => {
    const x = margin.left + datasetIndex * 160;
    const color = getColor(dataset.backgroundColor ?? dataset.borderColor, 0, datasetIndex);
    return `
      <rect x="${x}" y="${height - 28}" width="12" height="12" rx="2" fill="${color}" />
      <text x="${x + 18}" y="${height - 18}" font-size="12" fill="#374151">${escapeXml(dataset.label)}</text>
    `;
  }).join('');

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#FFFFFF" />
      ${title ? `<text x="${width / 2}" y="36" font-size="24" font-weight="600" text-anchor="middle" fill="#111827">${escapeXml(title)}</text>` : ''}
      ${gridLines}
      <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + chartHeight}" stroke="#9CA3AF" stroke-width="1.5" />
      <line x1="${margin.left}" y1="${margin.top + chartHeight}" x2="${margin.left + chartWidth}" y2="${margin.top + chartHeight}" stroke="#9CA3AF" stroke-width="1.5" />
      ${series}
      ${xAxisLabels}
      ${legend}
    </svg>
  `;
}

function renderPieChart(params: {
  type: Extract<ChartType, 'pie' | 'doughnut'>;
  width: number;
  height: number;
  title?: string;
  labels: string[];
  datasets: ChartDataset[];
}): string {
  const { type, width, height, title, labels, datasets } = params;
  const data = datasets[0]?.data ?? [];
  const total = data.reduce((sum, value) => sum + value, 0) || 1;
  const cx = width * 0.33;
  const cy = height * 0.52;
  const radius = Math.min(width, height) * 0.26;

  let currentAngle = 0;
  const slices = data.map((value, index) => {
    const angle = (value / total) * 360;
    const path = describeArc(cx, cy, radius, currentAngle, currentAngle + angle);
    const fill = getColor(datasets[0]?.backgroundColor, index, index);
    currentAngle += angle;
    return `<path d="${path}" fill="${fill}" />`;
  }).join('');

  const doughnutHole =
    type === 'doughnut'
      ? `<circle cx="${cx}" cy="${cy}" r="${radius * 0.55}" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1" />`
      : '';

  const legend = labels.map((label, index) => {
    const x = width * 0.62;
    const y = 120 + index * 28;
    const fill = getColor(datasets[0]?.backgroundColor, index, index);
    const value = data[index] ?? 0;
    return `
      <rect x="${x}" y="${y - 10}" width="12" height="12" rx="2" fill="${fill}" />
      <text x="${x + 18}" y="${y}" font-size="13" fill="#374151">${escapeXml(label)} — ${value}</text>
    `;
  }).join('');

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#FFFFFF" />
      ${title ? `<text x="${width / 2}" y="36" font-size="24" font-weight="600" text-anchor="middle" fill="#111827">${escapeXml(title)}</text>` : ''}
      ${slices}
      ${doughnutHole}
      ${legend}
    </svg>
  `;
}

function renderChartSvg(params: {
  type: ChartType;
  width: number;
  height: number;
  title?: string;
  labels: string[];
  datasets: ChartDataset[];
}): string {
  if (params.type === 'pie' || params.type === 'doughnut') {
    return renderPieChart({
      ...params,
      type: params.type,
    });
  }

  return renderCartesianChart({
    ...params,
    type: params.type,
  });
}

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
        const svg = renderChartSvg({ type, width, height, title, labels, datasets });
        const imageBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

        writeFileSync(safePath, imageBuffer);
        return { success: true, path: outputPath, width, height, type };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
  });
}
