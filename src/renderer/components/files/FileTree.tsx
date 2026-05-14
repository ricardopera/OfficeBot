import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFileStore } from '../../stores/fileStore';
import { useUiStore } from '../../stores/uiStore';
import { FolderOpen, File, ChevronRight, ChevronDown, FolderClosed } from 'lucide-react';
import type { FileEntry } from '@shared/types';

export function FileTree() {
  const { t } = useTranslation();
  const { fileTree, workspacePath, loadFileTree } = useFileStore();
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  const handleOpenWorkspace = async () => {
    const workspace = await window.electronAPI.openWorkspace();
    if (workspace) {
      useFileStore.getState().setWorkspacePath(workspace);
      await loadFileTree();
    }
  };

  if (!workspacePath) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <FolderOpen size={32} className="text-gray-300 mb-3" />
        <p className="text-sm text-gray-500 mb-3">{t('files.noWorkspace')}</p>
        <button onClick={handleOpenWorkspace} className="btn-primary text-xs">
          {t('files.openWorkspace')}
        </button>
      </div>
    );
  }

  const toggleDir = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide truncate">
          {workspacePath.split('/').pop()}
        </span>
        <button onClick={loadFileTree} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
          <FolderOpen size={12} />
        </button>
      </div>
      <div className="py-1">
        {fileTree.map((entry) => (
          <FileNode
            key={entry.path}
            entry={entry}
            depth={0}
            expandedDirs={expandedDirs}
            onToggleDir={toggleDir}
          />
        ))}
      </div>
    </div>
  );
}

interface FileNodeProps {
  entry: FileEntry;
  depth: number;
  expandedDirs: Set<string>;
  onToggleDir: (path: string) => void;
}

function FileNode({ entry, depth, expandedDirs, onToggleDir }: FileNodeProps) {
  const { openFile } = useFileStore();
  const { setMainPanel } = useUiStore();
  const isExpanded = expandedDirs.has(entry.path);

  const handleClick = async () => {
    if (entry.type === 'directory') {
      onToggleDir(entry.path);
    } else {
      await openFile(entry.path);
      setMainPanel('editor');
    }
  };

  return (
    <>
      <div
        onClick={handleClick}
        className="flex items-center gap-1 px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer text-sm"
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        {entry.type === 'directory' ? (
          <>
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            {isExpanded ? (
              <FolderOpen size={14} className="text-blue-400 flex-shrink-0" />
            ) : (
              <FolderClosed size={14} className="text-blue-400 flex-shrink-0" />
            )}
          </>
        ) : (
          <>
            <span className="w-3" />
            <File size={14} className="text-gray-400 flex-shrink-0" />
          </>
        )}
        <span className="truncate">{entry.name}</span>
      </div>
      {entry.type === 'directory' && isExpanded && entry.children && (
        entry.children.map((child) => (
          <FileNode
            key={child.path}
            entry={child}
            depth={depth + 1}
            expandedDirs={expandedDirs}
            onToggleDir={onToggleDir}
          />
        ))
      )}
    </>
  );
}
