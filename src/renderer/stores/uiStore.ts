import { create } from 'zustand';

type SidebarTab = 'files' | 'conversations' | 'search';
type MainPanel = 'chat' | 'editor';

interface UiStore {
  sidebarTab: SidebarTab;
  mainPanel: MainPanel;
  showSettings: boolean;
  showDetail: boolean;
  sidebarWidth: number;
  detailWidth: number;

  setSidebarTab: (tab: SidebarTab) => void;
  setMainPanel: (panel: MainPanel) => void;
  setShowSettings: (show: boolean) => void;
  toggleSettings: () => void;
  setShowDetail: (show: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setDetailWidth: (width: number) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  sidebarTab: 'conversations',
  mainPanel: 'chat',
  showSettings: false,
  showDetail: false,
  sidebarWidth: 280,
  detailWidth: 320,

  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  setMainPanel: (panel) => set({ mainPanel: panel }),
  setShowSettings: (show) => set({ showSettings: show }),
  toggleSettings: () => set((state) => ({ showSettings: !state.showSettings })),
  setShowDetail: (show) => set({ showDetail: show }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setDetailWidth: (width) => set({ detailWidth: width }),
}));
