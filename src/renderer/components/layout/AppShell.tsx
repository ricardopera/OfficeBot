import React, { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { ChatPanel } from '../chat/ChatPanel';
import { EditorPanel } from '../editor/EditorPanel';
import { TerminalPanel } from '../terminal/TerminalPanel';
import { StatusBar } from './StatusBar';
import { useUiStore } from '../../stores/uiStore';
import { useChatStore } from '../../stores/chatStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useFileStore } from '../../stores/fileStore';
import { useKeyboard } from '../../hooks/useKeyboard';

export function AppShell() {
  const { mainPanel, sidebarWidth } = useUiStore();
  const { loadConversations } = useChatStore();
  const { loadSettings, loadProviders } = useSettingsStore();
  const { setWorkspacePath, loadFileTree } = useFileStore();

  useKeyboard();

  useEffect(() => {
    const init = async () => {
      await loadSettings();
      await loadProviders();
      await loadConversations();
      const workspace = await window.electronAPI.getWorkspace();
      if (workspace) {
        setWorkspacePath(workspace);
        await loadFileTree();
      }
    };
    init();
  }, []);

  // Register stream event listener
  useEffect(() => {
    const { handleStreamEvent } = useChatStore.getState();
    const unsub = window.electronAPI.onStreamEvent(handleStreamEvent);
    return () => unsub();
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          className="flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
          style={{ width: sidebarWidth }}
        >
          <Sidebar />
        </div>

        {/* Main panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {mainPanel === 'chat' ? <ChatPanel /> : <EditorPanel />}
          <TerminalPanel />
        </div>
      </div>

      {/* Status bar */}
      <StatusBar />
    </div>
  );
}
