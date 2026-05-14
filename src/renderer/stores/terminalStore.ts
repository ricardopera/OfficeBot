import { create } from 'zustand';
import type { TerminalSession } from '@shared/types';

interface TerminalStore {
  sessions: TerminalSession[];
  activeTerminalId: string | null;
  isVisible: boolean;

  setSessions: (sessions: TerminalSession[]) => void;
  addSession: (session: TerminalSession) => void;
  removeSession: (id: string) => void;
  setActiveTerminal: (id: string | null) => void;
  setVisible: (visible: boolean) => void;
  toggleVisible: () => void;
}

export const useTerminalStore = create<TerminalStore>((set) => ({
  sessions: [],
  activeTerminalId: null,
  isVisible: false,

  setSessions: (sessions) => set({ sessions }),
  addSession: (session) =>
    set((state) => ({
      sessions: [...state.sessions, session],
      activeTerminalId: session.id,
      isVisible: true,
    })),
  removeSession: (id) =>
    set((state) => {
      const remaining = state.sessions.filter((s) => s.id !== id);
      return {
        sessions: remaining,
        activeTerminalId:
          state.activeTerminalId === id
            ? (remaining[remaining.length - 1]?.id ?? null)
            : state.activeTerminalId,
      };
    }),
  setActiveTerminal: (id) => set({ activeTerminalId: id }),
  setVisible: (visible) => set({ isVisible: visible }),
  toggleVisible: () => set((state) => ({ isVisible: !state.isVisible })),
}));
