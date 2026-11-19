import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PanelLeft } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { SearchModal } from './features/search/SearchModal';
import { ImportModal } from './features/import/ImportModal';
import { DeviceTransferModal } from './features/sync/DeviceTransferModal';
import { AuthModal } from './features/auth/AuthModal';
import { useSyncModalStore } from './features/sync/syncModalStore';
import { useUIStore } from './store/uiStore';
import { initAuthSync } from './services/firebaseAuthSync';
import { ProjectDetail } from './features/projects/ProjectDetail';
import { MindmapPage } from './features/mindmap/MindmapPage';
import { AllMindmapsPage } from './features/mindmap/AllMindmapsPage';
import { NotesPage } from './features/notes/NotesPage';
import { FlashcardsPage } from './features/flashcards/FlashcardsPage';
import { LearnMode } from './features/flashcards/LearnMode';
import { TaskcardsPage } from './features/taskcards/TaskcardsPage';
import { AllProjectsPage } from './features/projects/AllProjectsPage';
import { AllFlashcardsPage } from './features/flashcards/AllFlashcardsPage';
import { AllNotesPage } from './features/notes/AllNotesPage';
import { AllTaskcardsPage } from './features/taskcards/AllTaskcardsPage';
import { AllTimelinesPage } from './features/timelines/AllTimelinesPage';
import { TimelinesPage } from './features/timelines/TimelinesPage';
import { TimelinePage } from './features/timelines/TimelinePage';
import { SettingsPage } from './features/settings/SettingsPage';
import { GlossaryPage } from './features/glossary/GlossaryPage';
import { initStorage } from './store';

function App() {
  useEffect(() => {
    initStorage();
    const cleanupAuth = initAuthSync();

    // Check URL query parameters or hash for incoming transfer codes
    try {
      const searchParams = new URLSearchParams(window.location.search);
      let transferCode = searchParams.get('transfer') || searchParams.get('code');

      if (!transferCode && window.location.hash.includes('?')) {
        const hashQuery = window.location.hash.split('?')[1];
        const hashParams = new URLSearchParams(hashQuery);
        transferCode = hashParams.get('transfer') || hashParams.get('code');
      }

      if (transferCode) {
        useSyncModalStore.getState().openTransfer(transferCode);
      }
    } catch (e) {
      console.warn('Could not parse transfer URL params:', e);
    }

    return () => {
      cleanupAuth();
    };
  }, []);

  const { isSidebarOpen, toggleSidebar } = useUIStore();

  return (
    <HashRouter>
      <div className="flex h-screen overflow-hidden bg-bg-canvas relative">
        <Sidebar />
        <main className="flex-1 flex overflow-hidden relative">
          {!isSidebarOpen && (
            <button
              onClick={toggleSidebar}
              className="fixed top-2.5 left-2.5 z-30 flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-white/95 backdrop-blur-xs border border-border shadow-sm text-text-secondary hover:text-text-primary hover:bg-white transition-all text-xs font-medium cursor-pointer"
              title="Seitenleiste öffnen"
            >
              <PanelLeft size={14} />
              <span className="text-[11px] font-medium hidden sm:inline">Menü</span>
            </button>
          )}
          <Routes>
            {/* Root & Projects */}
            <Route path="/" element={<Navigate to="/projects" replace />} />
            <Route path="/projects" element={<AllProjectsPage />} />
            <Route path="/mindmaps" element={<AllMindmapsPage />} />
            <Route path="/timelines" element={<AllTimelinesPage />} />
            <Route path="/flashcards" element={<AllFlashcardsPage />} />
            <Route path="/taskcards" element={<AllTaskcardsPage />} />
            <Route path="/notes" element={<AllNotesPage />} />
            <Route path="/glossary" element={<GlossaryPage />} />

            {/* Project-scoped routes */}
            <Route path="/projects/:projectId" element={<ProjectDetail />} />
            <Route path="/projects/:projectId/mindmaps/:mindmapId" element={<MindmapPage />} />
            <Route path="/projects/:projectId/timelines" element={<TimelinesPage />} />
            <Route path="/projects/:projectId/timelines/:timelineId" element={<TimelinePage />} />
            <Route path="/projects/:projectId/notes" element={<NotesPage />} />
            <Route path="/projects/:projectId/notes/:noteId" element={<NotesPage />} />
            <Route path="/projects/:projectId/flashcards" element={<FlashcardsPage />} />
            <Route path="/projects/:projectId/flashcards/learn" element={<LearnMode />} />
            <Route path="/projects/:projectId/taskcards" element={<TaskcardsPage />} />
            <Route path="/projects/:projectId/glossary" element={<GlossaryPage />} />

            {/* Settings */}
            <Route path="/settings" element={<SettingsPage />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/projects" replace />} />
          </Routes>
        </main>

        {/* Global modals */}
        <SearchModal />
        <ImportModal />
        <DeviceTransferModal />
        <AuthModal />
      </div>
    </HashRouter>
  );
}

export default App;
