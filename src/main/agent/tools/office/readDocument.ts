import { tool } from 'ai';
import { z } from 'zod';
import mammoth from 'mammoth';
import { sanitizePath } from '../../../services/FileSystem';

type MammothMessage = { type: 'warning' | 'error'; message: string };
type MammothMarkdownResult = { value: string; messages: MammothMessage[] };
type MammothWithMarkdown = typeof mammoth & {
  convertToMarkdown: (input: { path: string }) => Promise<MammothMarkdownResult>;
};

export function createReadDocumentTool(workspacePath: string) {
  return tool({
    description: 'Lê um documento .docx e retorna o conteúdo em Markdown.',
    parameters: z.object({
      filePath: z.string().describe('Caminho relativo ao workspace (.docx)'),
    }),
    execute: async ({ filePath }) => {
      const safePath = sanitizePath(workspacePath, filePath);
      const result = await (mammoth as MammothWithMarkdown).convertToMarkdown({ path: safePath });
      return {
        success: true,
        content: result.value,
        warnings: result.messages.filter((m) => m.type === 'warning').map((m) => m.message),
      };
    },
  });
}
