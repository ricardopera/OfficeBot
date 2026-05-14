import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Pencil, Check, X, AlertTriangle } from 'lucide-react';
import type { Memory, MemoryType } from '@shared/types';

const MEMORY_TYPES: MemoryType[] = ['user', 'feedback', 'project', 'reference'];

interface EditState {
  id?: string;
  type: MemoryType;
  name: string;
  description: string;
  content: string;
}

const EMPTY_FORM: EditState = { type: 'user', name: '', description: '', content: '' };

export function MemoriesSettings() {
  const { t } = useTranslation();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const load = async () => {
    const list = await window.electronAPI.listMemories();
    setMemories(list);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async () => {
    if (!editState || !editState.name.trim() || !editState.content.trim()) return;

    if (editState.id) {
      await window.electronAPI.updateMemory(editState.id, {
        name: editState.name,
        description: editState.description || undefined,
        content: editState.content,
        type: editState.type,
      });
    } else {
      await window.electronAPI.createMemory({
        type: editState.type,
        name: editState.name,
        description: editState.description || undefined,
        content: editState.content,
      });
    }
    setEditState(null);
    load();
  };

  const handleDelete = async (id: string) => {
    await window.electronAPI.deleteMemory(id);
    setDeleteConfirmId(null);
    load();
  };

  const handleEdit = (mem: Memory) => {
    setEditState({
      id: mem.id,
      type: mem.type,
      name: mem.name,
      description: mem.description ?? '',
      content: mem.content,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{t('settings.memories')}</h3>
        <button
          onClick={() => setEditState(EMPTY_FORM)}
          className="btn-primary text-xs flex items-center gap-1"
        >
          <Plus size={12} />
          {t('settings.memoryAdd')}
        </button>
      </div>

      {/* Edit / create form */}
      {editState && (
        <div className="border border-blue-300 dark:border-blue-700 rounded-lg p-4 space-y-3 bg-blue-50 dark:bg-blue-900/20">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1">{t('settings.memoryName')} *</label>
              <input
                type="text"
                value={editState.name}
                onChange={(e) => setEditState({ ...editState, name: e.target.value })}
                className="input-field text-xs"
                placeholder={t('settings.memoryName')}
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">{t('settings.memoryType')}</label>
              <select
                value={editState.type}
                onChange={(e) => setEditState({ ...editState, type: e.target.value as MemoryType })}
                className="input-field text-xs"
              >
                {MEMORY_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium block mb-1">{t('settings.memoryDescription')}</label>
            <input
              type="text"
              value={editState.description}
              onChange={(e) => setEditState({ ...editState, description: e.target.value })}
              className="input-field text-xs"
              placeholder={t('settings.memoryDescription')}
            />
          </div>

          <div>
            <label className="text-xs font-medium block mb-1">{t('settings.memoryContent')} *</label>
            <textarea
              value={editState.content}
              onChange={(e) => setEditState({ ...editState, content: e.target.value })}
              rows={4}
              className="input-field text-xs resize-none"
              placeholder={t('settings.memoryContent')}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!editState.name.trim() || !editState.content.trim()}
              className="btn-primary text-xs flex items-center gap-1"
            >
              <Check size={12} />
              {t('settings.memorySave')}
            </button>
            <button
              onClick={() => setEditState(null)}
              className="btn-secondary text-xs flex items-center gap-1"
            >
              <X size={12} />
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {memories.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">{t('settings.memoryEmpty')}</p>
      ) : (
        <div className="space-y-2">
          {memories.map((mem) => (
            <div
              key={mem.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{mem.name}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 flex-shrink-0">{mem.type}</span>
                </div>
                {mem.description && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{mem.description}</p>
                )}
                <p className="text-xs text-gray-700 dark:text-gray-300 mt-1 line-clamp-2">{mem.content}</p>

                {/* Inline delete confirmation */}
                {deleteConfirmId === mem.id && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                    <AlertTriangle size={12} />
                    <span>{t('settings.memoryDeleteConfirm')}</span>
                    <button
                      onClick={() => handleDelete(mem.id)}
                      className="font-medium underline hover:no-underline"
                    >
                      {t('common.confirm')}
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="hover:underline"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => handleEdit(mem)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  title={t('settings.memoryEdit')}
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => setDeleteConfirmId(mem.id)}
                  className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-gray-500 hover:text-red-500"
                  title={t('settings.memoryDelete')}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
