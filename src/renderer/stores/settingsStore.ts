import { create } from 'zustand';
import type { AppSettings, LLMProvider } from '@shared/types';
import { DEFAULT_SETTINGS } from '@shared/types';

interface SettingsStore {
  settings: AppSettings;
  providers: LLMProvider[];
  theme: AppSettings['theme'];

  loadSettings: () => Promise<void>;
  saveSettings: (settings: Partial<AppSettings>) => Promise<void>;
  loadProviders: () => Promise<void>;
  createProvider: (provider: Omit<LLMProvider, 'id'>) => Promise<LLMProvider>;
  updateProvider: (id: string, updates: Partial<LLMProvider>) => Promise<void>;
  deleteProvider: (id: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  providers: [],
  theme: 'system',

  loadSettings: async () => {
    const settings = await window.electronAPI.getSettings();
    set({ settings, theme: settings.theme });
  },

  saveSettings: async (updates) => {
    const current = get().settings;
    const newSettings = { ...current, ...updates };
    await window.electronAPI.setSettings(newSettings);
    set({ settings: newSettings, theme: newSettings.theme });
  },

  loadProviders: async () => {
    const providers = await window.electronAPI.listProviders();
    set({ providers });
  },

  createProvider: async (provider) => {
    const created = await window.electronAPI.createProvider(provider);
    set((state) => ({ providers: [...state.providers, created] }));
    return created;
  },

  updateProvider: async (id, updates) => {
    await window.electronAPI.updateProvider(id, updates);
    set((state) => ({
      providers: state.providers.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));
  },

  deleteProvider: async (id) => {
    await window.electronAPI.deleteProvider(id);
    set((state) => ({ providers: state.providers.filter((p) => p.id !== id) }));
  },
}));
