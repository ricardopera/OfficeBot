import React, { useEffect } from 'react';
import { AppShell } from './components/layout/AppShell';
import { useSettingsStore } from './stores/settingsStore';
import { useUiStore } from './stores/uiStore';
import { SettingsModal } from './components/settings/SettingsModal';
import { ApprovalModal } from './components/chat/ApprovalModal';

export default function App() {
  const { theme, loadSettings } = useSettingsStore();
  const { showSettings } = useUiStore();

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      // system
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) root.classList.add('dark');
      else root.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <AppShell />
      {showSettings && <SettingsModal />}
      <ApprovalModal />
    </div>
  );
}
