import React, { useState, useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  FolderOpen,
  Network,
  CreditCard,
  StickyNote,
  Layers,
  Milestone,
  Settings,
  Search,
  ChevronDown,
  ChevronRight,
  Plus,
  HardDrive,
  QrCode,
  Cloud,
  PanelLeftClose,
  BookMarked,
  FileText,
  Languages,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useSearchStore } from '../features/search/searchStore';
import { useStore } from '../store';
import { useUIStore } from '../store/uiStore';
import { useImportStore } from '../features/import/importStore';
import { useStorageStatus } from '../services/storageSync';
import { useSyncModalStore } from '../features/sync/syncModalStore';
import { useCloudSync } from '../services/firebaseAuthSync';

export const Sidebar: React.FC = () => {
  const { open: openSearch } = useSearchStore();
  const { open: openImport } = useImportStore();
  const { openTransfer, openAuth } = useSyncModalStore();
  const { isSidebarOpen, toggleSidebar } = useUIStore();
  const { user, syncStatus } = useCloudSync();
  const navigate = useNavigate();
  const { projects, createProject, vocabItems } = useStore();
  const [projectsOpen, setProjectsOpen] = useState(true);
  const storage = useStorageStatus();

  const dueVocabCount = useMemo(() => {
    const nowTime = new Date().getTime();
    return Object.values(vocabItems || {}).filter(
      (v) => !v.nextReview || new Date(v.nextReview).getTime() <= nowTime
    ).length;
  }, [vocabItems]);

  const projectList = Object.values(projects).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );

  const handleNewProject = () => {
    const title = prompt('Projektname:');
    if (!title?.trim()) return;
    const p = createProject(title.trim());
    if (window.innerWidth < 1024) {
      toggleSidebar();
    }
    navigate(`/projects/${p.id}`);
  };

  const handleNavClick = () => {
    if (window.innerWidth < 1024) {
      toggleSidebar();
    }
  };

  return (
    <>
      {/* Dimmed backdrop for iPad / mobile when sidebar is open */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'w-[220px] lg:w-[196px] shrink-0 h-full border-r border-border bg-bg-canvas flex flex-col overflow-hidden transition-transform duration-200 z-50',
          'fixed inset-y-0 left-0 lg:static',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:hidden'
        )}
      >
        {/* Brand & Collapse */}
        <div className="px-3.5 pt-4 pb-3 flex items-center justify-between">
          <span className="text-[12.5px] font-semibold text-text-primary select-none tracking-tight">
            LearnMap
          </span>
          <button
            onClick={toggleSidebar}
            className="p-1 rounded text-text-disabled hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
            title="Seitenleiste schließen"
          >
            <PanelLeftClose size={15} />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="px-2.5 mb-2.5 space-y-1.5">
          <button
            onClick={() => {
              if (window.innerWidth < 1024) toggleSidebar();
              openImport();
            }}
            className="w-full flex items-center gap-1.5 px-2 py-2 rounded bg-bg-tertiary border border-border text-text-primary text-[11.5px] font-medium hover:bg-bg-hover transition-colors cursor-pointer"
          >
            <Plus size={13} strokeWidth={2.5} />
            <span>Lernmaterial hinzufügen</span>
          </button>

          <button
            onClick={() => {
              if (window.innerWidth < 1024) toggleSidebar();
              openTransfer();
            }}
            className="w-full flex items-center gap-1.5 px-2 py-2 rounded bg-bg-canvas border border-border text-text-secondary text-[11.5px] font-medium hover:bg-bg-secondary hover:text-text-primary transition-colors cursor-pointer"
            title="Materialien per 6-stelligem Code oder QR-Code aufs iPad übertragen"
          >
            <QrCode size={13} strokeWidth={2.2} className="text-text-primary" />
            <span>iPad-Transfer (Code)</span>
          </button>
        </div>

        {/* Search */}
        <button
          onClick={() => {
            if (window.innerWidth < 1024) toggleSidebar();
            openSearch();
          }}
          className="mx-2.5 mb-2.5 flex items-center gap-1.5 px-2 py-1.5 rounded bg-bg-tertiary border border-border text-text-disabled text-[11.5px] hover:text-text-secondary hover:border-border-strong transition-colors cursor-pointer"
        >
          <Search size={12} strokeWidth={2.5} />
          <span className="flex-1 text-left">Suchen...</span>
          <kbd className="text-[9.5px] bg-bg-canvas px-1 py-0.5 rounded font-mono border border-border text-text-disabled">⌘K</kbd>
        </button>

        {/* Primary nav */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-2 space-y-px">
          <NavItem to="/projects" icon={FolderOpen} label="Projekte" end onClick={handleNavClick} />

          {/* Projects section */}
          <div className="pt-2 pb-0.5">
            <div className="flex items-center justify-between px-1.5 mb-0.5">
              <button
                onClick={() => setProjectsOpen((o) => !o)}
                className="flex items-center gap-1 text-[10px] font-semibold tracking-widest uppercase text-text-disabled hover:text-text-secondary transition-colors cursor-pointer"
              >
                {projectsOpen ? <ChevronDown size={9} strokeWidth={2.5} /> : <ChevronRight size={9} strokeWidth={2.5} />}
                Meine Projekte
              </button>
              <button
                onClick={handleNewProject}
                className="p-1 rounded text-text-disabled hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
                title="Neues Projekt"
              >
                <Plus size={12} strokeWidth={2.5} />
              </button>
            </div>

            {projectsOpen && (
              <div className="space-y-px">
                {projectList.length === 0 ? (
                  <p className="text-[11px] text-text-disabled px-2.5 py-1 italic">Noch kein Projekt</p>
                ) : (
                  projectList.slice(0, 8).map((p) => (
                    <NavLink
                      key={p.id}
                      to={`/projects/${p.id}`}
                      onClick={handleNavClick}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11.5px] transition-colors truncate',
                          isActive
                            ? 'bg-bg-tertiary text-text-primary font-medium'
                            : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                        )
                      }
                    >
                      <FolderOpen size={12} className="shrink-0 opacity-50" />
                      <span className="truncate">{p.title}</span>
                    </NavLink>
                  ))
                )}
                {projectList.length > 8 && (
                  <NavLink to="/projects" onClick={handleNavClick} className="text-[11px] text-text-disabled px-2.5 py-1 hover:text-text-secondary block">
                    + {projectList.length - 8} weitere
                  </NavLink>
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="my-1.5 mx-1 border-t border-border" />

          {/* Lernmaterialien */}
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-text-disabled px-1.5 mb-0.5">
              Materialien
            </p>
            <NavItem to="/mindmaps"   icon={Network}    label="Mindmaps" onClick={handleNavClick} />
            <NavItem to="/timelines"  icon={Milestone}  label="Zeitstrahlen" onClick={handleNavClick} />
            <NavItem to="/flashcards" icon={CreditCard} label="Karteikarten" onClick={handleNavClick} />
            <NavItem
              to="/vocab"
              icon={Languages}
              label="Vokabeltrainer"
              badge={
                dueVocabCount > 0 ? (
                  <span className="ml-auto text-[9.5px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-500 text-white leading-none">
                    {dueVocabCount}
                  </span>
                ) : undefined
              }
              onClick={handleNavClick}
            />
            <NavItem to="/notes"      icon={StickyNote} label="Notizen" onClick={handleNavClick} />
            <NavItem to="/taskcards"  icon={Layers}     label="Taskcards" onClick={handleNavClick} />
            <NavItem to="/documents"  icon={FileText}   label="Dokumente & PDFs" onClick={handleNavClick} />
            <NavItem to="/glossary"   icon={BookMarked} label="Glossar" onClick={handleNavClick} />
          </div>
        </nav>

        {/* Cloud Account, Settings & Storage */}
        <div className="px-2 pb-3 border-t border-border pt-2 space-y-1">
          {/* Cloud Account Button */}
          <button
            onClick={() => {
              if (window.innerWidth < 1024) toggleSidebar();
              openAuth();
            }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded text-[11px] text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors text-left cursor-pointer"
            title={user ? `Angemeldet als ${user.email} (Cloud-Sync aktiv)` : 'Konto anlegen oder anmelden für automatischen Cloud-Sync'}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Cloud size={12} className={user ? 'shrink-0 text-emerald-600' : 'shrink-0 text-text-disabled'} />
              <span className="truncate">
                {syncStatus === 'syncing'
                  ? 'Wird synchronisiert...'
                  : user
                  ? (user.email ? user.email.split('@')[0] : 'Cloud-Sync aktiv')
                  : 'Offline / Anmelden'}
              </span>
            </div>
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full shrink-0',
                syncStatus === 'syncing'
                  ? 'bg-amber-400 animate-pulse'
                  : user
                  ? 'bg-emerald-500'
                  : 'bg-slate-300'
              )}
            />
          </button>

          {/* Local Storage Status */}
          <NavLink
            to="/settings"
            onClick={handleNavClick}
            className="flex items-center justify-between px-2.5 py-1.5 rounded text-[11px] text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors cursor-pointer"
            title={
              storage.status === 'error' && storage.error
                ? `Speicherfehler: ${storage.error}`
                : storage.isWebMode
                ? 'Lokal im Browser gesichert (IndexedDB & LocalStorage)'
                : `Festplatte: ${storage.filePath}`
            }
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <HardDrive size={12} className="shrink-0 text-text-disabled" />
              <span className="truncate">
                {storage.status === 'saving'
                  ? 'Wird gespeichert...'
                  : storage.status === 'error'
                  ? 'Speicherfehler'
                  : 'Lokal gesichert'}
              </span>
            </div>
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full shrink-0',
                storage.status === 'saving'
                  ? 'bg-amber-400 animate-pulse'
                  : storage.status === 'error'
                  ? 'bg-rose-500'
                  : 'bg-emerald-500'
              )}
            />
          </NavLink>

          <NavItem to="/settings" icon={Settings} label="Einstellungen" onClick={handleNavClick} />
        </div>
      </aside>
    </>
  );
};

// --- Helper nav item ---
interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  badge?: React.ReactNode;
  end?: boolean;
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon: Icon, label, badge, end, onClick }) => (
  <NavLink
    to={to}
    end={end}
    onClick={onClick}
    className={({ isActive }) =>
      cn(
        'flex items-center gap-2 px-2.5 py-1.5 rounded text-[12px] transition-colors cursor-pointer',
        isActive
          ? 'bg-bg-tertiary text-text-primary font-medium'
          : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
      )
    }
  >
    {({ isActive }) => (
      <>
        <Icon
          size={13}
          className={cn('shrink-0', isActive ? 'text-text-primary' : 'text-text-disabled')}
          strokeWidth={isActive ? 2.2 : 1.8}
        />
        <span className="truncate">{label}</span>
        {badge}
      </>
    )}
  </NavLink>
);
