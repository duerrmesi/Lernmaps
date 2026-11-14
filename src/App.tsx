import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { SearchModal } from './features/search/SearchModal';
import { ImportModal } from './features/import/ImportModal';
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
import { initStorage } from './store';

function App() {
  useEffect(() => {
    initStorage();
  }, []);

  return (
    <HashRouter>
      <div className="flex h-screen overflow-hidden bg-bg-canvas">
        <Sidebar />
        <main className="flex-1 flex overflow-hidden">
          <Routes>
            {/* Root & Projects */}
            <Route path="/" element={<Navigate to="/projects" replace />} />
            <Route path="/projects" element={<AllProjectsPage />} />
            <Route path="/mindmaps" element={<AllMindmapsPage />} />
            <Route path="/timelines" element={<AllTimelinesPage />} />
            <Route path="/flashcards" element={<AllFlashcardsPage />} />
            <Route path="/taskcards" element={<AllTaskcardsPage />} />
            <Route path="/notes" element={<AllNotesPage />} />

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

            {/* Settings */}
            <Route path="/settings" element={<SettingsPage />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/projects" replace />} />
          </Routes>
        </main>

        {/* Global modals */}
        <SearchModal />
        <ImportModal />
      </div>
    </HashRouter>
  );
}

export default App;
