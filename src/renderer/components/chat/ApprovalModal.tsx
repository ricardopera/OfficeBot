import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ApprovalRequest } from '@shared/types';
import { Shield, Check, X, ChevronsRight } from 'lucide-react';

export function ApprovalModal() {
  const { t } = useTranslation();
  const [request, setRequest] = useState<ApprovalRequest | null>(null);

  useEffect(() => {
    const unsub = window.electronAPI.onApprovalRequest((req) => {
      setRequest(req);
    });
    return () => unsub();
  }, []);

  if (!request) return null;

  const respond = (approved: boolean, approveAll = false) => {
    window.electronAPI.respondApproval({
      requestId: request.requestId,
      approved,
      approveAll,
    });
    setRequest(null);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <Shield size={20} className="text-orange-500" />
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">{t('chat.approvalTitle')}</h2>
            <p className="text-sm text-gray-500">{t('chat.approvalDesc')}</p>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Tool name */}
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">{t('chat.toolCall')}</span>
            <div className="mt-1 font-mono text-sm font-medium text-blue-600 dark:text-blue-400">
              {request.toolName}
            </div>
          </div>

          {/* Args */}
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">{t('chat.toolInput')}</span>
            <pre className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs font-mono text-gray-800 dark:text-gray-200 overflow-auto max-h-48 whitespace-pre-wrap break-all">
              {JSON.stringify(request.args, null, 2)}
            </pre>
          </div>

          {/* Diff if available */}
          {request.diff && (
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">{t('chat.toolDiff')}</span>
              <pre className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs font-mono overflow-auto max-h-48">
                {request.diff.split('\n').map((line, i) => (
                  <span
                    key={i}
                    className={`block ${
                      line.startsWith('+')
                        ? 'diff-added'
                        : line.startsWith('-')
                        ? 'diff-removed'
                        : ''
                    }`}
                  >
                    {line}
                  </span>
                ))}
              </pre>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={() => respond(true)} className="btn-primary flex items-center gap-2">
            <Check size={14} />
            {t('chat.approve')}
          </button>
          <button
            onClick={() => respond(true, true)}
            className="btn-secondary flex items-center gap-2"
          >
            <ChevronsRight size={14} />
            {t('chat.approveAll')}
          </button>
          <button onClick={() => respond(false)} className="btn-danger flex items-center gap-2 ml-auto">
            <X size={14} />
            {t('chat.reject')}
          </button>
        </div>
      </div>
    </div>
  );
}
