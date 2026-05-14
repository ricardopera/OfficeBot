import { useEffect } from 'react';
import { useUiStore } from '../stores/uiStore';
import { useTerminalStore } from '../stores/terminalStore';
import { useChatStore } from '../stores/chatStore';

export function useKeyboard() {
  const { toggleSettings, setSidebarTab } = useUiStore();
  const { toggleVisible } = useTerminalStore();
  const { createNewConversation } = useChatStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+, → Settings
      if (e.ctrlKey && e.key === ',') {
        e.preventDefault();
        toggleSettings();
      }

      // Ctrl+` → Toggle terminal
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        toggleVisible();
      }

      // Ctrl+Shift+N → New conversation
      if (e.ctrlKey && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        createNewConversation();
      }

      // Ctrl+1/2/3 → Switch sidebar tabs
      if (e.ctrlKey && e.key === '1') {
        e.preventDefault();
        setSidebarTab('files');
      }
      if (e.ctrlKey && e.key === '2') {
        e.preventDefault();
        setSidebarTab('conversations');
      }
      if (e.ctrlKey && e.key === '3') {
        e.preventDefault();
        setSidebarTab('search');
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleSettings, toggleVisible, createNewConversation, setSidebarTab]);
}
