import { IpcPayload } from '../contracts/ipcBridge';

export interface UserSettings {
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  locale?: string;
  fontSize?: number;
  notifications?: boolean;
  soundEnabled?: boolean;
}

export interface ApiKeyInput {
  provider: string;
  apiKey: string;
}

export async function handleSettingsGet(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { key?: string };
  return {
    theme: 'system',
    language: 'pt-BR',
    locale: 'pt-BR',
    fontSize: 14,
    notifications: true,
    soundEnabled: true,
  };
}

export async function handleSettingsUpdate(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as UserSettings;
  return { success: true, settings: data };
}

export async function handleSettingsApiKeySave(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as ApiKeyInput;
  return { success: true, provider: data.provider, saved: true };
}

export async function handleSettingsApiKeyDelete(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { provider: string };
  return { success: true, provider: data.provider, deleted: true };
}

export async function handleSettingsApiKeyList(payload: IpcPayload): Promise<unknown> {
  return {
    providers: ['openai', 'anthropic', 'gemini', 'bedrock', 'aionrs'],
    configured: ['openai'],
  };
}

export async function handleSettingsTheme(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { theme: 'light' | 'dark' | 'system' };
  return { success: true, theme: data.theme };
}

export async function handleSettingsLocale(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { locale: string };
  return { success: true, locale: data.locale, fallback: 'en-US' };
}

export async function handleSettingsNotifications(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { enabled: boolean };
  return { success: true, notifications: data.enabled };
}

export async function handleSettingsExport(payload: IpcPayload): Promise<unknown> {
  return { success: true, exportId: `settings_${Date.now()}`, data: {} };
}

export async function handleSettingsImport(payload: IpcPayload): Promise<unknown> {
  const data = payload.data as { settings: UserSettings };
  return { success: true, imported: true, settings: data.settings };
}

export async function handleSettingsReset(payload: IpcPayload): Promise<unknown> {
  return { success: true, reset: true };
}

export async function handleSettingsShortcuts(payload: IpcPayload): Promise<unknown> {
  return {
    shortcuts: {
      send: 'Ctrl+Enter',
      newChat: 'Ctrl+N',
      search: 'Ctrl+K',
    },
  };
}

export const settingsHandlers = {
  'settings:get': handleSettingsGet,
  'settings:update': handleSettingsUpdate,
  'settings:apikey:save': handleSettingsApiKeySave,
  'settings:apikey:delete': handleSettingsApiKeyDelete,
  'settings:apikey:list': handleSettingsApiKeyList,
  'settings:theme': handleSettingsTheme,
  'settings:locale': handleSettingsLocale,
  'settings:notifications': handleSettingsNotifications,
  'settings:export': handleSettingsExport,
  'settings:import': handleSettingsImport,
  'settings:reset': handleSettingsReset,
  'settings:shortcuts': handleSettingsShortcuts,
};