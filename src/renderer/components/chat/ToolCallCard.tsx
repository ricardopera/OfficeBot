import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ToolCallInfo } from '@shared/types';
import { ChevronDown, ChevronRight, Check, X, Loader2 } from 'lucide-react';

interface ToolCallCardProps {
  toolCall: ToolCallInfo;
}

const STATUS_ICONS = {
  pending: <Loader2 size={14} className="animate-spin text-yellow-500" />,
  running: <Loader2 size={14} className="animate-spin text-blue-500" />,
  done: <Check size={14} className="text-green-500" />,
  error: <X size={14} className="text-red-500" />,
  'awaiting-approval': <Loader2 size={14} className="animate-spin text-orange-500" />,
};

export function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const statusIcon = STATUS_ICONS[toolCall.status] ?? STATUS_ICONS.pending;

  return (
    <div className="tool-card">
      <div
        className="tool-card-header"
        onClick={() => setExpanded(!expanded)}
      >
        {statusIcon}
        <span className="text-xs font-mono font-medium text-gray-700 dark:text-gray-300">
          {toolCall.name}
        </span>
        <span className="flex-1" />
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </div>

      {expanded && (
        <div className="px-3 py-2 text-xs font-mono space-y-2 bg-white dark:bg-gray-900">
          <div>
            <span className="text-gray-500 uppercase tracking-wide">{t('chat.toolInput')}</span>
            <pre className="mt-1 text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-all">
              {JSON.stringify(toolCall.args, null, 2)}
            </pre>
          </div>

          {toolCall.result !== undefined && (
            <div>
              <span className="text-gray-500 uppercase tracking-wide">{t('chat.toolOutput')}</span>
              <pre className="mt-1 text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                {typeof toolCall.result === 'string'
                  ? toolCall.result
                  : JSON.stringify(toolCall.result, null, 2)}
              </pre>
            </div>
          )}

          {toolCall.error && (
            <div>
              <span className="text-red-500 uppercase tracking-wide">{t('common.error')}</span>
              <pre className="mt-1 text-red-600 dark:text-red-400 whitespace-pre-wrap">{toolCall.error}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
