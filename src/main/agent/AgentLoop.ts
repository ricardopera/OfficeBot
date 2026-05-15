import { streamText, type CoreMessage, type ToolSet } from 'ai';
import { createProviderInstance } from '../providers/factory';
import type { LLMProvider } from '../providers/types';
import type { AgentStreamEvent } from '@shared/types';

export interface AgentRunOptions {
  provider: LLMProvider;
  modelId: string;
  systemPrompt: string;
  messages: CoreMessage[];
  tools: ToolSet;
  maxSteps: number;
  conversationId: string;
  messageId: string;
  signal?: AbortSignal;
  onEvent: (event: AgentStreamEvent) => void;
}

export async function runAgent(opts: AgentRunOptions): Promise<void> {
  const {
    provider,
    modelId,
    systemPrompt,
    messages,
    tools,
    maxSteps,
    conversationId,
    messageId,
    signal,
    onEvent,
  } = opts;

  const aiProvider = createProviderInstance(provider);
  const model = aiProvider(modelId);
  type StreamToolResult = {
    toolCallId: string;
    toolName: string;
    args: unknown;
    result: unknown;
  };

  try {
    const result = streamText({
      model,
      system: systemPrompt,
      messages,
      tools,
      maxSteps,
      abortSignal: signal,
      onStepFinish: (step) => {
        // Emit tool call results
        if (step.toolResults && step.toolResults.length > 0) {
          for (const tr of step.toolResults as StreamToolResult[]) {
            onEvent({
              type: 'tool_result',
              conversationId,
              messageId,
              toolCall: {
                id: tr.toolCallId,
                name: tr.toolName,
                args: tr.args as Record<string, unknown>,
                result: tr.result,
                status: 'done',
                finishedAt: Date.now(),
              },
            });
          }
        }

        onEvent({
          type: 'step_finish',
          conversationId,
          messageId,
          usage: step.usage
            ? {
                promptTokens: step.usage.promptTokens,
                completionTokens: step.usage.completionTokens,
              }
            : undefined,
        });
      },
    });

    // Stream tool calls as they start
    for await (const chunk of result.fullStream as AsyncIterable<{
      type: string;
      textDelta?: string;
      error?: unknown;
      toolCallId?: string;
      toolName?: string;
      args?: unknown;
    }>) {
      if (signal?.aborted) break;

      switch (chunk.type) {
        case 'text-delta':
          onEvent({
            type: 'text_delta',
            conversationId,
            messageId,
            text: chunk.textDelta,
          });
          break;

        case 'tool-call':
          if (!chunk.toolCallId || !chunk.toolName) break;
          onEvent({
            type: 'tool_start',
            conversationId,
            messageId,
            toolCall: {
              id: chunk.toolCallId,
              name: chunk.toolName,
              args: chunk.args as Record<string, unknown>,
              status: 'running',
              startedAt: Date.now(),
            },
          });
          break;

        case 'error':
          onEvent({
            type: 'error',
            conversationId,
            messageId,
            error: String(chunk.error),
          });
          break;
      }
    }

    const finalUsage = await result.usage;
    onEvent({
      type: 'finish',
      conversationId,
      messageId,
      usage: finalUsage
        ? {
            promptTokens: finalUsage.promptTokens,
            completionTokens: finalUsage.completionTokens,
          }
        : undefined,
    });
  } catch (err: unknown) {
    if ((err as Error)?.name === 'AbortError') {
      onEvent({ type: 'finish', conversationId, messageId });
    } else {
      onEvent({
        type: 'error',
        conversationId,
        messageId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
