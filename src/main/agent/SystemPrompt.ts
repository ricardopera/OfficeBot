import type { Language, ApprovalMode } from '@shared/types';
import { platform } from 'os';

interface SystemPromptConfig {
  workspacePath: string;
  openFiles?: string[];
  language: Language;
  approvalMode: ApprovalMode;
  customInstructions?: string;
  memories?: string[];
}

export function assembleSystemPrompt(config: SystemPromptConfig): string {
  const os = platform() === 'win32' ? 'Windows' : 'Linux';
  const lang = config.language === 'pt-BR' ? 'português (pt-BR)' : 'English';

  const parts: string[] = [
    `Você é o **Office Bot**, um assistente de IA para trabalho de escritório no ${os}.`,
    `Você ajuda com manipulação de arquivos, planilhas, documentos, relatórios e análise de dados.`,
    ``,
    `## Workspace`,
    `Diretório de trabalho: \`${config.workspacePath}\``,
    `Nunca modifique arquivos fora deste diretório.`,
  ];

  if (config.openFiles && config.openFiles.length > 0) {
    parts.push(``, `## Arquivos abertos no editor`);
    config.openFiles.forEach((f) => parts.push(`- ${f}`));
  }

  parts.push(
    ``,
    `## Segurança e boas práticas`,
    `- Sempre resolva os caminhos relativos ao workspace.`,
    `- Prefira \`editFile\` a \`writeFile\` para modificações parciais.`,
    `- Antes de modificar um arquivo, leia-o primeiro com \`readFile\`.`,
    `- Nunca execute comandos bash destrutivos (rm -rf /, sudo, etc.).`,
    `- Verifique sempre antes de agir.`,
    ``,
    `## Modo de aprovação`,
    `Modo atual: **${config.approvalMode}**`,
    getApprovalDescription(config.approvalMode),
    ``,
    `## Formato de resposta`,
    `- Use Markdown para formatar as respostas.`,
    `- Blocos de código devem incluir a linguagem (ex: \`\`\`python).`,
    `- Use tabelas quando apropriado.`,
    `- Seja conciso mas completo.`,
    ``,
    `## Idioma`,
    `Responda sempre em **${lang}**.`,
  );

  if (config.customInstructions) {
    parts.push(``, `## Instruções personalizadas`, config.customInstructions);
  }

  if (config.memories && config.memories.length > 0) {
    parts.push(``, `## Memórias do usuário`);
    config.memories.forEach((m) => parts.push(`- ${m}`));
  }

  return parts.join('\n');
}

function getApprovalDescription(mode: ApprovalMode): string {
  switch (mode) {
    case 'safe':
      return '- Todas as ações de escrita e bash requerem aprovação explícita do usuário.';
    case 'semi-auto':
      return '- Leitura, glob e grep são aprovados automaticamente. Escrita e bash requerem confirmação.';
    case 'yolo':
      return '- Quase tudo é aprovado automaticamente. Apenas bash requer aprovação.';
    case 'custom':
      return '- Políticas de aprovação personalizadas estão ativas.';
  }
}
