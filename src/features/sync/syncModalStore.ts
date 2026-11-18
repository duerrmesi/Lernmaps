import { create } from 'zustand';

interface SyncModalStore {
  isTransferOpen: boolean;
  initialCode?: string;
  openTransfer: (code?: string) => void;
  closeTransfer: () => void;

  isAuthOpen: boolean;
  openAuth: () => void;
  closeAuth: () => void;
}

export const useSyncModalStore = create<SyncModalStore>((set) => ({
  isTransferOpen: false,
  initialCode: undefined,
  openTransfer: (code?: string) => set({ isTransferOpen: true, initialCode: code }),
  closeTransfer: () => set({ isTransferOpen: false, initialCode: undefined }),

  isAuthOpen: false,
  openAuth: () => set({ isAuthOpen: true }),
  closeAuth: () => set({ isAuthOpen: false }),
}));
