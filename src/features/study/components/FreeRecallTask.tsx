import React, { useState } from 'react';
import { Button } from '../../../components/Button';
import { useStore } from '../../../store';
import type { KnowledgeNode } from '../../../types';

interface Props {
  node: KnowledgeNode;
  onNext: () => void;
}

export const FreeRecallTask: React.FC<Props> = ({ node, onNext }) => {
  const [answer, setAnswer] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [_success, setSuccess] = useState<boolean | null>(null);
  const { recordLearningEvent } = useStore();

  const handleReveal = () => {
    if (!answer.trim()) return;
    setRevealed(true);
  };

  const handleScore = (passed: boolean) => {
    setSuccess(passed);
    recordLearningEvent(node.projectId, node.id, 'free_recall', passed ? 'correct' : 'incorrect', 'hard');
    onNext();
  };

  if (!revealed) {
    return (
      <div className="flex flex-col items-center w-full">
        <div className="bg-bg-canvas border border-border rounded-xl p-8 w-full shadow-sm flex flex-col mb-6">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[11px] text-blue-500 uppercase font-semibold">Active Recall</span>
          </div>
          <h3 className="text-[15px] font-medium text-text-primary mb-2">Schreibe alles auf, was du über das Thema weißt:</h3>
          <h2 className="text-xl font-bold text-text-primary mb-6">{node.title}</h2>
          <textarea 
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            className="w-full text-[13px] bg-bg-secondary border border-border rounded-lg px-4 py-3 text-text-primary resize-none h-40"
            placeholder="Deine Gedanken..."
          />
        </div>
        <Button variant="primary" onClick={handleReveal} disabled={!answer.trim()}>Mit Notizen vergleichen</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full">
      <div className="bg-bg-canvas border border-border rounded-xl p-8 w-full shadow-sm flex flex-col mb-6">
        <h2 className="text-xl font-bold text-text-primary mb-4">{node.title}</h2>
        <div className="border-l-2 border-blue-500 pl-4 py-1 mb-6">
          <p className="text-[11px] text-text-disabled uppercase font-semibold mb-1">Was du wusstest</p>
          <p className="text-[13px] text-text-primary whitespace-pre-wrap">{answer}</p>
        </div>
        <div className="bg-bg-tertiary rounded-lg p-4 border border-border">
          <p className="text-[11px] text-text-disabled uppercase font-semibold mb-2">Deine Notizen / Beschreibung</p>
          <p className="text-[13px] text-text-primary whitespace-pre-wrap">{node.description || 'Keine Beschreibung hinterlegt.'}</p>
          {node.notes.length > 0 && (
            <p className="text-[11px] text-text-secondary mt-4 italic">Es sind noch {node.notes.length} Notizen auf dem Whiteboard hinterlegt.</p>
          )}
        </div>
      </div>
      
      <p className="text-[13px] text-text-secondary mb-4">Hast du die wichtigsten Punkte erwischt?</p>
      
      <div className="flex items-center gap-4 w-full">
        <Button className="flex-1 text-red-700 bg-red-50 border-red-200 hover:bg-red-100" variant="secondary" onClick={() => handleScore(false)}>Nein, viel vergessen</Button>
        <Button className="flex-1 text-green-700 bg-green-50 border-green-200 hover:bg-green-100" variant="secondary" onClick={() => handleScore(true)}>Ja, war gut</Button>
      </div>
    </div>
  );
};
