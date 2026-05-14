import { create } from 'zustand';
import type { FileEntry } from '@shared/types';

interface FileStore {
  workspacePath: string | null;
  fileTree: FileEntry[];
  openFiles: { path: string; content: string; isDirty: boolean }[];
  activeFilePath: string | null;

  setWorkspacePath: (path: string | null) => void;
  loadFileTree: (dirPath?: string) => Promise<void>;
  openFile: (path: string) => Promise<void>;
  closeFile: (path: string) => void;
  saveFile: (path: string, content: string) => Promise<void>;
  updateFileContent: (path: string, content: string) => void;
  setActiveFile: (path: string | null) => void;
}

export const useFileStore = create<FileStore>((set, get) => ({
  workspacePath: null,
  fileTree: [],
  openFiles: [],
  activeFilePath: null,

  setWorkspacePath: (path) => set({ workspacePath: path }),

  loadFileTree: async (dirPath = '.') => {
    const entries = await window.electronAPI.listDir(dirPath);
    if (Array.isArray(entries)) {
      set({ fileTree: entries as FileEntry[] });
    }
  },

  openFile: async (path) => {
    const { openFiles } = get();
    const already = openFiles.find((f) => f.path === path);
    if (already) {
      set({ activeFilePath: path });
      return;
    }
    const result = await window.electronAPI.readFile(path);
    if (result.content !== undefined) {
      set((state) => ({
        openFiles: [...state.openFiles, { path, content: result.content, isDirty: false }],
        activeFilePath: path,
      }));
    }
  },

  closeFile: (path) =>
    set((state) => {
      const remaining = state.openFiles.filter((f) => f.path !== path);
      return {
        openFiles: remaining,
        activeFilePath:
          state.activeFilePath === path
            ? (remaining[remaining.length - 1]?.path ?? null)
            : state.activeFilePath,
      };
    }),

  saveFile: async (path, content) => {
    await window.electronAPI.writeFile(path, content);
    set((state) => ({
      openFiles: state.openFiles.map((f) =>
        f.path === path ? { ...f, content, isDirty: false } : f
      ),
    }));
  },

  updateFileContent: (path, content) =>
    set((state) => ({
      openFiles: state.openFiles.map((f) =>
        f.path === path ? { ...f, content, isDirty: true } : f
      ),
    })),

  setActiveFile: (path) => set({ activeFilePath: path }),
}));
