import React, { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Square, Paperclip } from 'lucide-react';

interface ChatInputProps {
  onSend: (text: string) => void;
  onStop: () => void;
  isLoading: boolean;
}

export function ChatInput({ onSend, onStop, isLoading }: ChatInputProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const text = value.trim();
    if (!text || isLoading) return;
    onSend(text);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, isLoading, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    // Auto-resize
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 240) + 'px';
  };

  const handleFileAttach = async () => {
    const result = await window.electronAPI.openFileDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Documentos', extensions: ['txt', 'csv', 'xlsx', 'docx', 'pdf', 'png', 'jpg', 'json', 'xml', 'md'] }],
    });
    if (!result.canceled && result.filePaths.length > 0) {
      const paths = result.filePaths.map((p: string) => p.split('/').pop()).join(', ');
      setValue((prev) => prev + (prev ? '\n' : '') + `[Arquivo: ${paths}]`);
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3">
      <div className="flex items-end gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 px-3 py-2">
        <button
          onClick={handleFileAttach}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0 mb-1"
          title={t('chat.uploadFile')}
        >
          <Paperclip size={18} />
        </button>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={t('chat.placeholder')}
          rows={1}
          className="flex-1 resize-none bg-transparent outline-none text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 max-h-60"
          disabled={isLoading}
        />

        <div className="flex-shrink-0 mb-1">
          {isLoading ? (
            <button
              onClick={onStop}
              className="w-8 h-8 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              title={t('chat.stop')}
            >
              <Square size={14} />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!value.trim()}
              className="w-8 h-8 flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              title={t('chat.send')}
            >
              <Send size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
