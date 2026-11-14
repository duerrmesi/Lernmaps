import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { MindmapEditor } from './MindmapEditor';

export const MindmapPage: React.FC = () => {
  const { projectId, mindmapId } = useParams<{ projectId: string; mindmapId: string }>();
  const navigate = useNavigate();
  const { mindmaps, projects } = useStore();

  const mindmap = mindmapId ? mindmaps[mindmapId] : null;
  const project = projectId ? projects[projectId] : null;

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
      <div className="shrink-0 flex items-center gap-0 px-4 py-2 border-b border-border bg-white">
        <button
          onClick={() => navigate(`/projects/${projectId}`)}
          className="text-[11.5px] text-text-disabled hover:text-text-secondary transition-colors"
        >
          {project?.title}
        </button>
        <span className="text-[11.5px] text-text-disabled mx-1.5">/</span>
        <span className="text-[11.5px] font-medium text-text-primary">{mindmap.title}</span>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <MindmapEditor mindmapId={mindmapId} projectId={projectId} />
      </div>
    </div>
  );
};
