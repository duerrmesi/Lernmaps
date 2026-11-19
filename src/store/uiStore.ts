import { create } from 'zustand';

interface UIStore {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  // Default to true on desktop screens, false on smaller screens (e.g. iPad portrait / mobile)
  isSidebarOpen: typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (open: boolean) => set({ isSidebarOpen: open }),
}));
