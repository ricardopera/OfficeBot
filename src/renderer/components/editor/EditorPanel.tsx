import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useFileStore } from '../../stores/fileStore';
import { X, Circle } from 'lucide-react';
import { EditorTabs } from './EditorTabs';

export function EditorPanel() {
  const { t } = useTranslation();
  const { openFiles, activeFilePath, updateFileContent, setActiveFile } = useFileStore();

  const activeFile = openFiles.find((f) => f.path === activeFilePath);

  if (openFiles.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <div className="text-center">
          <div className="text-4xl mb-2">📄</div>
          <p className="text-sm">{t('editor.noFile')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <EditorTabs />
      {activeFile && (
        <MonacoEditor
          key={activeFile.path}
          path={activeFile.path}
          content={activeFile.content}
          onChange={(content) => updateFileContent(activeFile.path, content)}
        />
      )}
    </div>
  );
}

function MonacoEditor({
  path,
  content,
  onChange,
}: {
  path: string;
  content: string;
  onChange: (c: string) => void;
}) {
  // Lazy-load Monaco editor
  const [Editor, setEditor] = React.useState<React.ComponentType<{
    value: string;
    onChange?: (v: string | undefined) => void;
    language?: string;
    theme?: string;
    options?: object;
    height?: string;
  }> | null>(null);

  useEffect(() => {
    import('@monaco-editor/react').then((m) => {
      setEditor(() => m.default);
    });
  }, []);

  const language = getLanguageFromPath(path);

  if (!Editor) {
    return (
      <div className="flex-1 p-4 font-mono text-sm bg-gray-900 text-gray-200 overflow-auto">
        <pre>{content}</pre>
      </div>
    );
  }

  return (
    <Editor
      value={content}
      language={language}
      theme="vs-dark"
      height="100%"
      options={{
        minimap: { enabled: true },
        fontSize: 14,
        lineNumbers: 'on',
        wordWrap: 'on',
        automaticLayout: true,
        bracketPairColorization: { enabled: true },
      }}
      onChange={(v) => onChange(v ?? '')}
    />
  );
}

function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    java: 'java',
    cs: 'csharp',
    json: 'json',
    html: 'html',
    css: 'css',
    md: 'markdown',
    yaml: 'yaml',
    yml: 'yaml',
    sh: 'shell',
    sql: 'sql',
    xml: 'xml',
    csv: 'plaintext',
    txt: 'plaintext',
  };
  return map[ext] ?? 'plaintext';
}
