import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  Trash2,
  ArrowLeft,
  Menu,
  Volume2,
  VolumeX,
  CreditCard,
  Check,
} from 'lucide-react';
import { useStore, useNotesByProject } from '../../store';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { RichTextEditor } from './RichTextEditor';
import { formatDate } from '../../utils';
import { cn } from '../../utils/cn';
import type { Note } from '../../types';
import { speakText, stopSpeech, isSpeechActive } from '../../utils/speech';

export const NotesPage: React.FC = () => {
  const { projectId, noteId } = useParams<{ projectId?: string; noteId?: string }>();
  const navigate = useNavigate();
  const { projects, createNote, updateNote, deleteNote, createFlashcard } = useStore();
  const notes = useNotesByProject(projectId || '');

  const project = projectId ? projects[projectId] : null;
  const selectedNote = noteId ? useStore.getState().notes[noteId] : null;
  const [activeNote, setActiveNote] = useState<Note | null>(selectedNote || notes[0] || null);
  const [editTitle, setEditTitle] = useState(activeNote?.title || '');
  const [showNotesList, setShowNotesList] = useState(true);

  // Text to speech state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [cardCreatedToast, setCardCreatedToast] = useState(false);

  useEffect(() => {
    const note = noteId ? useStore.getState().notes[noteId] : notes[0];
    setActiveNote(note || null);
    setEditTitle(note?.title || '');
    stopSpeech();
    setIsPlayingAudio(false);
  }, [noteId, notes.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = () => {
    if (!projectId) return;
    const note = createNote(projectId);
    setActiveNote(note);
    setEditTitle(note.title);
    navigate(`/projects/${projectId}/notes/${note.id}`);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Notiz löschen?')) return;
    deleteNote(id);
    const remaining = notes.filter((n) => n.id !== id);
    if (remaining.length > 0) {
      navigate(`/projects/${projectId}/notes/${remaining[0].id}`);
    } else {
      navigate(`/projects/${projectId}/notes`);
      setActiveNote(null);
    }
  };

  const handleTitleChange = useCallback(
    (id: string, title: string) => {
      setEditTitle(title);
      const timer = setTimeout(() => updateNote(id, { title }), 400);
      return () => clearTimeout(timer);
    },
    [updateNote]
  );

  const handleContentChange = useCallback(
    (id: string, content: string) => {
      updateNote(id, { content });
    },
    [updateNote]
  );

  const toggleSpeak = () => {
    if (isPlayingAudio) {
      stopSpeech();
      setIsPlayingAudio(false);
    } else {
      if (!activeNote) return;
      const cleanContent = activeNote.content.replace(/<[^>]*>/g, ' ');
      const fullText = `${activeNote.title}. ${cleanContent}`;
      const started = speakText(fullText);
      setIsPlayingAudio(started);

      // Check periodically if done
      const interval = setInterval(() => {
        if (!isSpeechActive()) {
          setIsPlayingAudio(false);
          clearInterval(interval);
        }
      }, 500);
    }
  };

  // Convert Note to Flashcard
  const handleConvertToFlashcard = () => {
    if (!activeNote || !projectId) return;
    const cleanContent = activeNote.content.replace(/<[^>]*>/g, ' ').trim();
    createFlashcard(projectId, activeNote.title, cleanContent || 'Kein Inhalt', {
      tags: ['Notizen'],
    });

    setCardCreatedToast(true);
    setTimeout(() => setCardCreatedToast(false), 2500);
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      {/* Notes list sidebar */}
      <div
        className={cn(
          'w-[220px] shrink-0 border-r border-border flex flex-col h-full bg-bg-secondary transition-all',
          !showNotesList && 'hidden md:flex'
        )}
      >
        <div className="px-3 py-3 border-b border-border flex items-center justify-between">
          {project && (
            <button
              onClick={() => navigate(`/projects/${projectId}`)}
              className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              <ArrowLeft size={13} />
              <span className="truncate max-w-[100px]">{project.title}</span>
            </button>
          )}
          <Button variant="ghost" size="sm" onClick={handleCreate} className="p-1 cursor-pointer">
            <Plus size={14} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin py-1">
          {notes.length === 0 ? (
            <p className="text-xs text-text-disabled px-3 py-4 text-center">Keine Notizen</p>
          ) : (
            notes.map((note) => (
              <button
                key={note.id}
                onClick={() => {
                  setActiveNote(note);
                  setEditTitle(note.title);
                  if (window.innerWidth < 768) setShowNotesList(false);
                  navigate(`/projects/${projectId}/notes/${note.id}`);
                }}
                className={cn(
                  'w-full text-left px-3 py-2.5 transition-colors border-b border-border/50 cursor-pointer',
                  activeNote?.id === note.id
                    ? 'bg-white border-l-2 border-l-accent'
                    : 'hover:bg-bg-tertiary'
                )}
              >
                <p className="text-sm font-medium text-text-primary truncate">{note.title}</p>
                <p className="text-xs text-text-disabled mt-0.5">{formatDate(note.updatedAt)}</p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Editor area */}
      {activeNote ? (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Note header */}
          <div className="flex items-center justify-between px-4 sm:px-8 py-3 border-b border-border shrink-0 bg-white gap-2">
            <button
              onClick={() => setShowNotesList(!showNotesList)}
              className="p-1.5 rounded hover:bg-bg-secondary text-text-secondary md:hidden cursor-pointer"
              title="Notizliste ein-/ausblenden"
            >
              <Menu size={16} />
            </button>

            <input
              value={editTitle}
              onChange={(e) => handleTitleChange(activeNote.id, e.target.value)}
              className="text-xl sm:text-2xl font-medium text-text-primary bg-transparent outline-none flex-1 tracking-tight"
              placeholder="Titel…"
            />

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Text to Speech */}
              <button
                onClick={toggleSpeak}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1.5 rounded text-xs transition-colors cursor-pointer border',
                  isPlayingAudio
                    ? 'bg-accent text-white border-accent animate-pulse'
                    : 'bg-white border-border text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                )}
                title={isPlayingAudio ? 'Vorlesen stoppen' : 'Notiz vorlesen (TTS)'}
              >
                {isPlayingAudio ? <VolumeX size={13} /> : <Volume2 size={13} />}
                <span className="hidden sm:inline">
                  {isPlayingAudio ? 'Stopp' : 'Vorlesen'}
                </span>
              </button>

              {/* Convert to Flashcard */}
              <button
                onClick={handleConvertToFlashcard}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs bg-white border border-border text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors cursor-pointer"
                title="Aus dieser Notiz eine Karteikarte erstellen"
              >
                {cardCreatedToast ? (
                  <Check size={13} className="text-success" />
                ) : (
                  <CreditCard size={13} />
                )}
                <span className="hidden sm:inline">
                  {cardCreatedToast ? 'Karteikarte erstellt!' : 'Als Karteikarte'}
                </span>
              </button>

              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDelete(activeNote.id)}
                className="cursor-pointer"
                title="Notiz löschen"
              >
                <Trash2 size={13} />
              </Button>
            </div>
          </div>

          {/* Rich text editor */}
          <div className="flex-1 overflow-y-auto scrollbar-thin px-4 sm:px-8 py-4 sm:py-6">
            <RichTextEditor
              key={activeNote.id}
              content={activeNote.content}
              onChange={(content) => handleContentChange(activeNote.id, content)}
              placeholder="Beginne zu schreiben…"
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            title="Keine Notiz ausgewählt"
            description="Erstelle eine neue Notiz oder wähle eine bestehende aus."
            action={
              projectId ? (
                <Button variant="primary" onClick={handleCreate}>
                  <Plus size={14} /> Neue Notiz
                </Button>
              ) : undefined
            }
          />
        </div>
      )}
    </div>
  );
};
