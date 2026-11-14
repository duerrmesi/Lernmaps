import { create } from 'zustand';

export type AIProvider = 'gemini' | 'openrouter' | 'ollama';

interface ImportStore {
  isOpen: boolean;
  provider: AIProvider;
  apiKeys: Record<AIProvider, string>;
  models: Record<AIProvider, string>;
  setProvider: (provider: AIProvider) => void;
  setApiKey: (provider: AIProvider, key: string) => void;
  setModel: (provider: AIProvider, model: string) => void;
  open: () => void;
  close: () => void;
}

export const useImportStore = create<ImportStore>((set) => ({
  isOpen: false,
  provider: 'gemini',
  apiKeys: {
    gemini: '',
    openrouter: '',
    ollama: 'http://localhost:11434',
  },
  models: {
    gemini: 'gemini-2.5-flash',
    openrouter: 'google/gemini-2.5-flash',
    ollama: 'llama3',
  },
  setProvider: (provider) => set({ provider }),
  setApiKey: (provider, key) => set((state) => ({ apiKeys: { ...state.apiKeys, [provider]: key } })),
  setModel: (provider, model) => set((state) => ({ models: { ...state.models, [provider]: model } })),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));

