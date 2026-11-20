import React, { useState, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Folder,
  FolderPlus,
  Upload,
  FileText,
  Trash2,
  Edit2,
  ChevronRight,
  Search,
  Move,
  ArrowLeft,
  FolderOpen,
  Eye,
  FileUp,
  Loader2,
} from 'lucide-react';
import { useStore } from '../../store';
import { usePDFViewerStore } from '../../store/pdfViewerStore';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { formatFileSize } from '../../utils/attachmentStorage';
import { formatDate, generateId } from '../../utils';
import { savePdfToStorage, getPdfPageCount } from '../../utils/documentStorage';
import type { DocumentFile, DocumentFolder, ID } from '../../types';
import { cn } from '../../utils/cn';

interface DocumentsPageProps {
  projectIdOverride?: string;
  hideProjectHeader?: boolean;
}

export const DocumentsPage: React.FC<DocumentsPageProps> = ({
  projectIdOverride,
  hideProjectHeader = false,
}) => {
  const params = useParams<{ projectId?: string }>();
  const currentProjectId = projectIdOverride || params.projectId;

  const {
    projects,
    folders = {},
    documents = {},
    createFolder,
    updateFolder,
    deleteFolder,
    addDocument,
    updateDocument,
    deleteDocument,
  } = useStore();

  const { openViewer } = usePDFViewerStore();

  const [currentFolderId, setCurrentFolderId] = useState<ID | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Modals
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [folderNameInput, setFolderNameInput] = useState('');
  const [editingFolder, setEditingFolder] = useState<DocumentFolder | null>(null);

  const [editingDoc, setEditingDoc] = useState<DocumentFile | null>(null);
  const [docNameInput, setDocNameInput] = useState('');

  const [movingDoc, setMovingDoc] = useState<DocumentFile | null>(null);
  const [targetFolderId, setTargetFolderId] = useState<string>('root');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const project = currentProjectId ? projects[currentProjectId] : null;

  // Filter folders and documents for the current project
  const projectFolders = useMemo(() => {
    return Object.values(folders).filter((f) =>
      currentProjectId ? f.projectId === currentProjectId : true
    );
  }, [folders, currentProjectId]);

  const projectDocuments = useMemo(() => {
    return Object.values(documents).filter((d) =>
      currentProjectId ? d.projectId === currentProjectId : true
    );
  }, [documents, currentProjectId]);

  // Current folder's children
  const currentFolders = useMemo(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return projectFolders.filter((f) => f.name.toLowerCase().includes(q));
    }
    return projectFolders.filter((f) => f.parentId === currentFolderId);
  }, [projectFolders, currentFolderId, searchQuery]);

  const currentDocs = useMemo(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return projectDocuments.filter((d) => d.name.toLowerCase().includes(q));
    }
    return projectDocuments.filter((d) => d.folderId === currentFolderId);
  }, [projectDocuments, currentFolderId, searchQuery]);

  // Breadcrumbs
  const breadcrumbs = useMemo(() => {
    const crumbs: { id: ID | null; name: string }[] = [{ id: null, name: 'Hauptordner' }];
    let curr = currentFolderId ? folders[currentFolderId] : null;
    const trail: { id: ID; name: string }[] = [];

    while (curr) {
      trail.unshift({ id: curr.id, name: curr.name });
      curr = curr.parentId ? folders[curr.parentId] : null;
    }

    return [...crumbs, ...trail];
  }, [currentFolderId, folders]);

  // Upload handler
  const handleUploadFiles = async (files: FileList | File[]) => {
    if (!currentProjectId) {
      alert('Bitte wähle zuerst ein Projekt aus, um Dokumente hochzuladen.');
      return;
    }

    const fileList = Array.from(files);
    const pdfFiles = fileList.filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );

    if (pdfFiles.length === 0) {
      alert('Bitte wähle mindestens eine PDF-Datei aus.');
      return;
    }

    setIsUploading(true);
    try {
      for (const file of pdfFiles) {
        const arrayBuffer = await file.arrayBuffer();
        const storageKey = `doc_pdf_${generateId()}`;

        // Save binary data to IndexedDB
        await savePdfToStorage(storageKey, arrayBuffer);

        // Get total page count
        const pageCount = await getPdfPageCount(arrayBuffer);

        // Save metadata to store
        addDocument(
          currentProjectId,
          file.name,
          file.size,
          storageKey,
          pageCount,
          currentFolderId
        );
      }
    } catch (err) {
      console.error('Fehler beim Upload:', err);
      alert('Fehler beim Hochladen der Datei.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderNameInput.trim() || !currentProjectId) return;
    createFolder(currentProjectId, folderNameInput.trim(), currentFolderId);
    setFolderNameInput('');
    setShowCreateFolder(false);
  };

  const handleSaveRenameFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFolder || !folderNameInput.trim()) return;
    updateFolder(editingFolder.id, { name: folderNameInput.trim() });
    setEditingFolder(null);
    setFolderNameInput('');
  };

  const handleSaveRenameDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc || !docNameInput.trim()) return;
    updateDocument(editingDoc.id, { name: docNameInput.trim() });
    setEditingDoc(null);
    setDocNameInput('');
  };

  const handleSaveMoveDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!movingDoc) return;
    const newFolderId = targetFolderId === 'root' ? null : targetFolderId;
    updateDocument(movingDoc.id, { folderId: newFolderId });
    setMovingDoc(null);
  };

  return (
    <div
      className="flex-1 flex flex-col h-full bg-bg-canvas overflow-y-auto"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.length) {
          handleUploadFiles(e.dataTransfer.files);
        }
      }}
    >
      {/* Optional Top Header if not embedded */}
      {!hideProjectHeader && (
        <div className="border-b border-border bg-bg-primary px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {currentProjectId && (
                  <Link
                    to={`/projects/${currentProjectId}`}
                    className="text-xs text-text-secondary hover:text-text-primary flex items-center gap-1"
                  >
                    <ArrowLeft size={13} />
                    <span>Zurück zum Projekt</span>
                  </Link>
                )}
              </div>
              <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <FolderOpen className="text-primary" size={22} />
                Dokumente & Skripte
                {project && (
                  <span className="text-sm font-normal text-text-secondary">
                    – {project.title}
                  </span>
                )}
              </h1>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="p-6 max-w-6xl w-full mx-auto space-y-4">
        {/* Navigation & Action Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-bg-primary p-3 rounded-xl border border-border">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 text-xs text-text-secondary overflow-x-auto py-1">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.id || 'root'}>
                {idx > 0 && <ChevronRight size={13} className="text-text-disabled shrink-0" />}
                <button
                  onClick={() => setCurrentFolderId(crumb.id)}
                  className={cn(
                    'px-2 py-1 rounded transition-colors truncate max-w-[140px] cursor-pointer',
                    crumb.id === currentFolderId
                      ? 'bg-bg-tertiary text-text-primary font-semibold'
                      : 'hover:text-text-primary hover:bg-bg-hover'
                  )}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Action Buttons & Search */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Search */}
            <div className="relative">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-disabled"
              />
              <input
                type="text"
                placeholder="Dokumente suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-3 py-1.5 text-xs rounded-lg border border-border bg-bg-secondary text-text-primary focus:outline-hidden focus:border-primary w-40 sm:w-48"
              />
            </div>

            {/* New Folder */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setFolderNameInput('');
                setShowCreateFolder(true);
              }}
              className="flex items-center gap-1.5"
            >
              <FolderPlus size={14} />
              <span>Ordner</span>
            </Button>

            {/* Upload PDF */}
            <Button
              variant="primary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-1.5"
            >
              {isUploading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Upload size={14} />
              )}
              <span>PDF hochladen</span>
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) {
                  handleUploadFiles(e.target.files);
                }
              }}
            />
          </div>
        </div>

        {/* Drag & Drop Visual Hint */}
        {isDragging && (
          <div className="border-2 border-dashed border-primary bg-primary/10 rounded-xl p-8 flex flex-col items-center justify-center text-center">
            <FileUp size={36} className="text-primary animate-bounce mb-2" />
            <p className="text-sm font-semibold text-primary">
              PDFs hier loslassen zum Hochladen
            </p>
          </div>
        )}

        {/* Folders Grid */}
        {currentFolders.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-disabled mb-2 px-1">
              Ordner ({currentFolders.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {currentFolders.map((f) => {
                const docCount = projectDocuments.filter((sd) => sd.folderId === f.id).length;

                return (
                  <div
                    key={f.id}
                    className="group relative flex items-center justify-between p-3 rounded-xl border border-border bg-bg-primary hover:border-primary/50 hover:bg-bg-hover transition-all cursor-pointer shadow-2xs"
                    onClick={() => setCurrentFolderId(f.id)}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Folder size={18} className="text-amber-500 fill-amber-500/20 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-text-primary truncate" title={f.name}>
                          {f.name}
                        </p>
                        <p className="text-[10.5px] text-text-disabled">
                          {docCount} {docCount === 1 ? 'Datei' : 'Dateien'}
                        </p>
                      </div>
                    </div>

                    {/* Actions menu hover */}
                    <div
                      className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          setEditingFolder(f);
                          setFolderNameInput(f.name);
                        }}
                        className="p-1 rounded text-text-disabled hover:text-text-primary hover:bg-bg-tertiary cursor-pointer"
                        title="Umbenennen"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Ordner "${f.name}" wirklich löschen?`)) {
                            deleteFolder(f.id);
                          }
                        }}
                        className="p-1 rounded text-text-disabled hover:text-rose-400 hover:bg-bg-tertiary cursor-pointer"
                        title="Löschen"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Documents Grid / List */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-disabled">
              PDF-Dokumente ({currentDocs.length})
            </h2>
          </div>

          {currentDocs.length === 0 && currentFolders.length === 0 ? (
            <div className="border border-dashed border-border rounded-xl p-12 flex flex-col items-center justify-center text-center bg-bg-primary/50">
              <FileText size={36} className="text-text-disabled mb-3 opacity-60" />
              <p className="text-sm font-semibold text-text-primary mb-1">
                Dieser Ordner ist leer
              </p>
              <p className="text-xs text-text-secondary max-w-sm mb-4">
                Lade Skripte, Vorlesungsfolien oder Übungsblätter als PDF hoch oder erstelle Unterordner.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5"
              >
                <Upload size={14} />
                <span>PDF auswählen</span>
              </Button>
            </div>
          ) : currentDocs.length === 0 ? (
            <p className="text-xs text-text-disabled italic px-2 py-4">
              Keine PDF-Dateien in diesem Ordner.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {currentDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="group relative flex flex-col justify-between p-3.5 rounded-xl border border-border bg-bg-primary hover:border-primary/50 hover:bg-bg-hover transition-all shadow-2xs"
                >
                  <div className="flex items-start gap-2.5 mb-3">
                    <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500 shrink-0">
                      <FileText size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3
                        className="text-xs font-semibold text-text-primary line-clamp-2 hover:text-primary transition-colors cursor-pointer"
                        title={doc.name}
                        onClick={() => openViewer(doc.id, 1)}
                      >
                        {doc.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-text-secondary">
                        {doc.pageCount && doc.pageCount > 0 ? (
                          <span className="font-medium text-primary">
                            {doc.pageCount} {doc.pageCount === 1 ? 'Seite' : 'Seiten'}
                          </span>
                        ) : null}
                        <span>•</span>
                        <span>{formatFileSize(doc.size)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer & Action Buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                    <span className="text-[10px] text-text-disabled">
                      {formatDate(doc.createdAt)}
                    </span>

                    <div className="flex items-center gap-1">
                      {/* Open Viewer */}
                      <button
                        onClick={() => openViewer(doc.id, 1)}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 text-[11.5px] font-medium transition-colors cursor-pointer"
                        title="Im PDF-Viewer öffnen"
                      >
                        <Eye size={13} />
                        <span>Öffnen</span>
                      </button>

                      {/* Move to folder */}
                      <button
                        onClick={() => {
                          setMovingDoc(doc);
                          setTargetFolderId(doc.folderId || 'root');
                        }}
                        className="p-1 rounded text-text-disabled hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
                        title="In Ordner verschieben"
                      >
                        <Move size={13} />
                      </button>

                      {/* Rename */}
                      <button
                        onClick={() => {
                          setEditingDoc(doc);
                          setDocNameInput(doc.name);
                        }}
                        className="p-1 rounded text-text-disabled hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
                        title="Umbenennen"
                      >
                        <Edit2 size={13} />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => {
                          if (window.confirm(`Dokument "${doc.name}" wirklich löschen?`)) {
                            deleteDocument(doc.id);
                          }
                        }}
                        className="p-1 rounded text-text-disabled hover:text-rose-400 hover:bg-bg-tertiary transition-colors cursor-pointer"
                        title="Löschen"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create Folder */}
      <Modal
        isOpen={showCreateFolder}
        onClose={() => setShowCreateFolder(false)}
        title="Neuen Ordner erstellen"
      >
        <form onSubmit={handleCreateFolder} className="space-y-4">
          <Input
            label="Ordnername"
            placeholder="z. B. Vorlesungsfolien, Altklausuren..."
            value={folderNameInput}
            onChange={(e) => setFolderNameInput(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowCreateFolder(false)}>
              Abbrechen
            </Button>
            <Button variant="primary" type="submit" disabled={!folderNameInput.trim()}>
              Erstellen
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Rename Folder */}
      <Modal
        isOpen={!!editingFolder}
        onClose={() => setEditingFolder(null)}
        title="Ordner umbenennen"
      >
        <form onSubmit={handleSaveRenameFolder} className="space-y-4">
          <Input
            label="Name des Ordners"
            value={folderNameInput}
            onChange={(e) => setFolderNameInput(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditingFolder(null)}>
              Abbrechen
            </Button>
            <Button variant="primary" type="submit" disabled={!folderNameInput.trim()}>
              Speichern
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Rename Document */}
      <Modal
        isOpen={!!editingDoc}
        onClose={() => setEditingDoc(null)}
        title="Dokument umbenennen"
      >
        <form onSubmit={handleSaveRenameDoc} className="space-y-4">
          <Input
            label="Dateiname"
            value={docNameInput}
            onChange={(e) => setDocNameInput(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditingDoc(null)}>
              Abbrechen
            </Button>
            <Button variant="primary" type="submit" disabled={!docNameInput.trim()}>
              Speichern
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Move Document to Folder */}
      <Modal
        isOpen={!!movingDoc}
        onClose={() => setMovingDoc(null)}
        title={`"${movingDoc?.name}" verschieben`}
      >
        <form onSubmit={handleSaveMoveDoc} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Zielordner auswählen
            </label>
            <select
              value={targetFolderId}
              onChange={(e) => setTargetFolderId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg-secondary text-text-primary text-xs focus:outline-hidden focus:border-primary"
            >
              <option value="root">📁 Hauptordner (Root)</option>
              {projectFolders.map((f) => (
                <option key={f.id} value={f.id}>
                  📁 {f.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setMovingDoc(null)}>
              Abbrechen
            </Button>
            <Button variant="primary" type="submit">
              Verschieben
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
