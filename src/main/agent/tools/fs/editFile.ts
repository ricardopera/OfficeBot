import { tool } from 'ai';
import { z } from 'zod';
import { readFileSync, writeFileSync } from 'fs';
import { sanitizePath } from '../../../services/FileSystem';
import type { ApprovalEngine } from '../../ApprovalEngine';

/**
 * Generates a unified-diff-style string showing the change with surrounding context.
 * @param original - full original file content
 * @param oldStr   - the exact string being replaced
 * @param newStr   - the replacement string
 */
function buildDiff(original: string, oldStr: string, newStr: string): string {
  const CONTEXT_LINES = 3;
  const lines = original.split('\n');
  const oldLines = oldStr.split('\n');
  const newLines = newStr.split('\n');

  // Find the line index where oldStr starts
  let startLine = -1;
  outer: for (let i = 0; i <= lines.length - oldLines.length; i++) {
    for (let j = 0; j < oldLines.length; j++) {
      if (lines[i + j] !== oldLines[j]) continue outer;
    }
    startLine = i;
    break;
  }

  if (startLine === -1) {
    // Fallback: simple +/- block with no context
    const diffLines: string[] = [];
    for (const line of oldLines) diffLines.push(`- ${line}`);
    for (const line of newLines) diffLines.push(`+ ${line}`);
    return diffLines.join('\n');
  }

  const contextStart = Math.max(0, startLine - CONTEXT_LINES);
  const contextEnd = Math.min(lines.length, startLine + oldLines.length + CONTEXT_LINES);
  const result: string[] = [];

  result.push(`@@ -${contextStart + 1},${contextEnd - contextStart} @@`);

  for (let i = contextStart; i < startLine; i++) {
    result.push(` ${lines[i]}`);
  }
  for (const line of oldLines) {
    result.push(`-${line}`);
  }
  for (const line of newLines) {
    result.push(`+${line}`);
  }
  for (let i = startLine + oldLines.length; i < contextEnd; i++) {
    result.push(` ${lines[i]}`);
  }

  return result.join('\n');
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
        return { success: false, reason: 'String not found in file' };
      }
      if (count > 1) {
        return { success: false, reason: `String found ${count} times. Use a more specific string.` };
      }

      const diff = buildDiff(original, oldStr, newStr);
      const approved = await approval.requestApproval('editFile', { filePath, oldStr, newStr }, diff);
      if (!approved) return { success: false, reason: 'Rejected by user' };

      const modified = original.replace(oldStr, newStr);
      writeFileSync(safePath, modified, 'utf-8');
      return { success: true, path: filePath, diff };
    },
  });
}
