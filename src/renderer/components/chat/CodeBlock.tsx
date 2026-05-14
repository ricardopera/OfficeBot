import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language: string;
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-2 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1 bg-gray-800 text-gray-400 text-xs">
        <span className="font-mono">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white transition-colors"
          title={t('chat.copyCode')}
        >
          {copied ? (
            <>
              <Check size={12} />
              {t('chat.copied')}
            </>
          ) : (
            <>
              <Copy size={12} />
              {t('chat.copyCode')}
            </>
          )}
        </button>
      </div>
      {/* Code */}
      <pre className="bg-gray-900 text-gray-100 p-4 overflow-x-auto text-xs font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
}
