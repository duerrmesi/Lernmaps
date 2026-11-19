import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Check } from 'lucide-react';
import { useStore } from '../../store';
import { MindmapEditor } from './MindmapEditor';

export const MindmapPage: React.FC = () => {
  const { projectId, mindmapId } = useParams<{ projectId: string; mindmapId: string }>();
  const navigate = useNavigate();
  const { mindmaps, projects, updateMindmap } = useStore();

  const mindmap = mindmapId ? mindmaps[mindmapId] : null;
  const project = projectId ? projects[projectId] : null;

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(mindmap?.title || '');
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mindmap?.title) {
      setTitleValue(mindmap.title);
    }
  }, [mindmap?.title]);

  useEffect(() => {
    if (isEditingTitle) {
      setTimeout(() => titleInputRef.current?.focus(), 50);
    }
  }, [isEditingTitle]);

  const handleTitleCommit = () => {
    if (!mindmapId) return;
    const val = titleValue.trim();
    if (val && val !== mindmap?.title) {
      updateMindmap(mindmapId, { title: val });
    }
    setIsEditingTitle(false);
  };

  if (!mindmap || !projectId || !mindmapId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-text-secondary text-sm">Mindmap nicht gefunden.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header bar — compact breadcrumb */}
      <div className="shrink-0 flex items-center justify-between px-3 sm:px-4 py-2 border-b border-border bg-white z-20">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            onClick={() => navigate(`/projects/${projectId}`)}
            className="flex items-center gap-1 text-[12px] text-text-secondary hover:text-text-primary transition-colors cursor-pointer p-1 rounded"
            title="Zurück zum Projekt"
          >
            <ArrowLeft size={14} />
            <span className="truncate max-w-[120px] sm:max-w-[200px] font-medium">{project?.title}</span>
          </button>
          <span className="text-[12px] text-text-disabled">/</span>

          {isEditingTitle ? (
            <div className="flex items-center gap-1">
              <input
                ref={titleInputRef}
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleCommit();
                  if (e.key === 'Escape') {
                    setTitleValue(mindmap.title);
                    setIsEditingTitle(false);
                  }
                }}
                onBlur={handleTitleCommit}
                className="text-[12px] font-semibold text-text-primary bg-bg-secondary px-2 py-0.5 rounded border border-accent outline-none"
              />
              <button onClick={handleTitleCommit} className="text-accent p-1 cursor-pointer">
                <Check size={13} />
              </button>
            </div>
          ) : (
            <div
              onClick={() => setIsEditingTitle(true)}
              className="flex items-center gap-1 cursor-pointer group/title px-1 py-0.5 rounded hover:bg-bg-secondary transition-colors"
              title="Klicken zum Umbenennen der Mindmap"
            >
              <span className="text-[12px] font-semibold text-text-primary truncate max-w-[160px] sm:max-w-none">
                {mindmap.title}
              </span>
              <Edit2 size={11} className="text-text-disabled group-hover/title:text-text-primary shrink-0 transition-colors" />
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden relative">
        <MindmapEditor mindmapId={mindmapId} projectId={projectId} />
      </div>
    </div>
  );
};
