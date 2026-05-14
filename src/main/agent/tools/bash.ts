import { tool } from 'ai';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { ApprovalEngine } from '../ApprovalEngine';
import { DANGEROUS_BASH_PATTERNS } from '@shared/constants';

const execAsync = promisify(exec);

export function createBashTool(workspacePath: string, approval: ApprovalEngine) {
  return tool({
    description: 'Executa um comando shell no workspace. Use com cautela.',
    parameters: z.object({
      command: z.string().describe('Comando a executar'),
      timeout: z.number().optional().describe('Timeout em ms (padrão: 30000)'),
    }),
    execute: async ({ command, timeout = 30000 }) => {
      // Safety check
      for (const pattern of DANGEROUS_BASH_PATTERNS) {
        if (pattern.test(command)) {
          return { success: false, error: `Comando bloqueado por segurança: corresponde ao padrão ${pattern}` };
        }
      }

      const approved = await approval.requestApproval('bash', { command });
      if (!approved) return { success: false, error: 'Rejeitado pelo usuário' };

      try {
        const { stdout, stderr } = await execAsync(command, {
          cwd: workspacePath,
          timeout,
          maxBuffer: 1024 * 1024 * 5, // 5 MB
        });
        return {
          success: true,
          stdout: stdout.slice(0, 10000),
          stderr: stderr.slice(0, 2000),
          command,
        };
      } catch (err: unknown) {
        const e = err as { message: string; stdout?: string; stderr?: string; code?: number };
        return {
          success: false,
          error: e.message,
          stdout: e.stdout?.slice(0, 5000) ?? '',
          stderr: e.stderr?.slice(0, 2000) ?? '',
          exitCode: e.code,
        };
      }
    },
  });
}
