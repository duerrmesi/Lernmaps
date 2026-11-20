import { create } from 'zustand';

export type PDFViewMode = 'split' | 'modal';

interface PDFViewerState {
  isOpen: boolean;
  documentId: string | null;
  currentPage: number;
  viewMode: PDFViewMode;
  linkingNodeId: string | null; // Node to link to if requested from Mindmap
  openViewer: (
    documentId: string,
    page?: number,
    options?: { mode?: PDFViewMode; nodeId?: string }
  ) => void;
  closeViewer: () => void;
  setCurrentPage: (page: number) => void;
  setViewMode: (mode: PDFViewMode) => void;
  toggleViewMode: () => void;
  setLinkingNodeId: (nodeId: string | null) => void;
}

export const usePDFViewerStore = create<PDFViewerState>((set) => ({
  isOpen: false,
  documentId: null,
  currentPage: 1,
  viewMode: 'split',
  linkingNodeId: null,

  openViewer: (documentId, page = 1, options) => {
    set((s) => ({
      isOpen: true,
      documentId,
      currentPage: page > 0 ? page : 1,
      viewMode: options?.mode || s.viewMode || 'split',
      linkingNodeId: options?.nodeId !== undefined ? options.nodeId : s.linkingNodeId,
    }));
  },

  closeViewer: () => {
    set({
      isOpen: false,
      documentId: null,
      linkingNodeId: null,
    });
  },

  setCurrentPage: (page) => {
    set({ currentPage: Math.max(1, page) });
  },

  setViewMode: (mode) => {
    set({ viewMode: mode });
  },

  toggleViewMode: () => {
    set((s) => ({ viewMode: s.viewMode === 'split' ? 'modal' : 'split' }));
  },

  setLinkingNodeId: (nodeId) => {
    set({ linkingNodeId: nodeId });
  },
}));
