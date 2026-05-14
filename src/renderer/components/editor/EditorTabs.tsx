import React from 'react';
import { useTranslation } from 'react-i18next';
import { useFileStore } from '../../stores/fileStore';
import { X } from 'lucide-react';

export function EditorTabs() {
  const { t } = useTranslation();
  const { openFiles, activeFilePath, setActiveFile, closeFile, saveFile } = useFileStore();

  const handleSave = async (path: string) => {
    const file = openFiles.find((f) => f.path === path);
    if (file) {
      await saveFile(path, file.content);
    }
  };

  return (
    <div className="flex items-center border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-x-auto">
      {openFiles.map((file) => {
        const name = file.path.split('/').pop() ?? file.path;
        const isActive = file.path === activeFilePath;
        return (
          <div
            key={file.path}
            onClick={() => setActiveFile(file.path)}
            className={`flex items-center gap-2 px-3 py-2 cursor-pointer border-r border-gray-200 dark:border-gray-700 text-sm flex-shrink-0 ${
              isActive
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                : 'bg-gray-50 dark:bg-gray-900 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <span className="truncate max-w-[120px]">{name}</span>
            {file.isDirty && (
              <span className="w-2 h-2 bg-blue-500 rounded-full" title={t('editor.unsaved')} />
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (file.isDirty) {
                  if (confirm(`Salvar "${name}" antes de fechar?`)) {
                    handleSave(file.path);
                  }
                }
                closeFile(file.path);
              }}
              className="hover:bg-gray-200 dark:hover:bg-gray-700 rounded p-0.5"
              title={t('editor.close')}
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
