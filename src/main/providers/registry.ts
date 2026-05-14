import type { DatabaseService } from '../services/Database';
import type { LLMProvider } from './types';

export class ProviderRegistry {
  constructor(private db: DatabaseService) {}

  list(): LLMProvider[] {
    return this.db.listProviders();
  }

  get(id: string): LLMProvider | undefined {
    return this.db.getProvider(id);
  }

  create(provider: Omit<LLMProvider, 'id'>): LLMProvider {
    const id = `provider_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const full: LLMProvider = { id, ...provider };
    this.db.saveProvider(full);
    return full;
  }

  update(id: string, updates: Partial<LLMProvider>): LLMProvider {
    const existing = this.get(id);
    if (!existing) throw new Error(`Provider ${id} not found`);
    const updated: LLMProvider = { ...existing, ...updates, id };
    this.db.saveProvider(updated);
    return updated;
  }

  delete(id: string): void {
    this.db.deleteProvider(id);
  }
}
