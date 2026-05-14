import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../stores/settingsStore';
import { Plus, Trash2, Eye, EyeOff, RefreshCw } from 'lucide-react';
import type { LLMProvider } from '@shared/types';

export function ProviderSettings() {
  const { t } = useTranslation();
  const { providers, settings, createProvider, updateProvider, deleteProvider, saveSettings } =
    useSettingsStore();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    baseURL: '',
    apiKey: '',
    defaultModel: '',
  });
  const [showKey, setShowKey] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [fetchedModels, setFetchedModels] = useState<{ id: string; name: string }[]>([]);

  const handleSubmit = async () => {
    if (!form.name || !form.baseURL || !form.apiKey) return;

    const providerData: Omit<LLMProvider, 'id'> = {
      name: form.name,
      baseURL: form.baseURL,
      apiKey: form.apiKey,
      defaultModel: form.defaultModel,
      models: fetchedModels.map((m) => ({
        id: m.id,
        name: m.name,
        provider: form.name,
        contextWindow: 128000,
        maxOutputTokens: 4096,
        pricing: { input: 0, output: 0 },
      })),
      supportsFunctionCalling: true,
      supportsStreaming: true,
    };

    if (editId) {
      await updateProvider(editId, providerData);
    } else {
      const created = await createProvider(providerData);
      await saveSettings({ activeProviderId: created.id });
    }

    setShowForm(false);
    setEditId(null);
    setForm({ name: '', baseURL: '', apiKey: '', defaultModel: '' });
    setFetchedModels([]);
  };

  const handleFetchModels = async () => {
    setFetchingModels(true);
    try {
      // Create temp provider to fetch models
      const tempProvider = { id: 'temp', ...form, models: [], supportsFunctionCalling: true, supportsStreaming: true };
      // We need to save it first or use the existing ID
      if (editId) {
        const result = await window.electronAPI.fetchModels(editId);
        if (result.success) setFetchedModels(result.models);
      }
    } finally {
      setFetchingModels(false);
    }
  };

  const handleEdit = (provider: LLMProvider) => {
    setEditId(provider.id);
    setForm({
      name: provider.name,
      baseURL: provider.baseURL,
      apiKey: provider.apiKey,
      defaultModel: provider.defaultModel,
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{t('settings.provider')}</h3>
        <button onClick={() => setShowForm(true)} className="btn-primary text-xs flex items-center gap-1">
          <Plus size={12} />
          {t('settings.addProvider')}
        </button>
      </div>

      {/* Provider list */}
      {providers.length === 0 ? (
        <p className="text-sm text-gray-500">{t('settings.noProviders')}</p>
      ) : (
        <div className="space-y-2">
          {providers.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div>
                <div className="font-medium text-sm">{p.name}</div>
                <div className="text-xs text-gray-500">{p.baseURL}</div>
                <div className="text-xs text-gray-400">{p.defaultModel}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => saveSettings({ activeProviderId: p.id })}
                  className={`text-xs px-2 py-1 rounded ${
                    settings.activeProviderId === p.id
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {settings.activeProviderId === p.id ? '✓ Ativo' : 'Ativar'}
                </button>
                <button onClick={() => handleEdit(p)} className="btn-secondary text-xs py-1 px-2">
                  Editar
                </button>
                <button
                  onClick={() => deleteProvider(p.id)}
                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3">
          <h4 className="font-medium text-sm">
            {editId ? t('settings.editProvider') : t('settings.addProvider')}
          </h4>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">{t('settings.providerName')}</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="OpenRouter"
              className="input-field"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">{t('settings.baseURL')}</label>
            <input
              value={form.baseURL}
              onChange={(e) => setForm((f) => ({ ...f, baseURL: e.target.value }))}
              placeholder="https://openrouter.ai/api/v1"
              className="input-field"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">{t('settings.apiKey')}</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={form.apiKey}
                onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
                placeholder="sk-..."
                className="input-field pr-8"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">{t('settings.defaultModel')}</label>
            <input
              value={form.defaultModel}
              onChange={(e) => setForm((f) => ({ ...f, defaultModel: e.target.value }))}
              placeholder="anthropic/claude-sonnet-4"
              className="input-field"
              list="models-list"
            />
            {fetchedModels.length > 0 && (
              <datalist id="models-list">
                {fetchedModels.map((m) => <option key={m.id} value={m.id} />)}
              </datalist>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handleSubmit} className="btn-primary text-xs">
              {t('common.save')}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setEditId(null);
              }}
              className="btn-secondary text-xs"
            >
              {t('common.cancel')}
            </button>
            {editId && (
              <button
                onClick={handleFetchModels}
                disabled={fetchingModels}
                className="btn-secondary text-xs flex items-center gap-1 ml-auto"
              >
                <RefreshCw size={12} className={fetchingModels ? 'animate-spin' : ''} />
                {fetchingModels ? t('settings.fetchingModels') : t('settings.fetchModels')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
