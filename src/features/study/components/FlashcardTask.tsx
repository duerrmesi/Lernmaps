import React, { useState } from 'react';
import { Button } from '../../../components/Button';
import { useStore } from '../../../store';
import type { Flashcard, KnowledgeNode } from '../../../types';

interface Props {
  node: KnowledgeNode;
  item: Flashcard;
  onNext: () => void;
}

export const FlashcardTask: React.FC<Props> = ({ node, item, onNext }) => {
  const [flipped, setFlipped] = useState(false);
  const { reviewKnowledgeNode, recordLearningEvent } = useStore();

  const handleScore = (score: 1 | 2 | 3 | 4) => {
    const ratingMap: Record<number, 'again' | 'hard' | 'good' | 'easy'> = {
      1: 'again', 2: 'hard', 3: 'good', 4: 'easy'
    };
    reviewKnowledgeNode(node.id, ratingMap[score]);
    
    let result: 'correct' | 'incorrect' | 'partial' = 'correct';
    if (score === 1) result = 'incorrect';
    else if (score === 2) result = 'partial';
    
    recordLearningEvent(node.projectId, node.id, 'flashcard', result, 'medium');
    onNext();
  };

  if (!flipped) {
    return (
      <div className="flex flex-col items-center w-full">
        <div className="bg-bg-canvas border border-border rounded-xl p-10 w-full min-h-[250px] shadow-sm flex flex-col items-center justify-center mb-6 cursor-pointer hover:border-blue-500 transition-colors" onClick={() => setFlipped(true)}>
          <p className="text-[13px] text-text-disabled uppercase tracking-wide font-semibold mb-4">Frage</p>
          <p className="text-lg text-text-primary text-center leading-relaxed" dangerouslySetInnerHTML={{ __html: item.front }}></p>
        </div>
        <Button variant="primary" onClick={() => setFlipped(true)}>Antwort anzeigen</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full">
      <div className="bg-bg-canvas border border-border rounded-xl p-10 w-full min-h-[250px] shadow-sm flex flex-col mb-6">
        <div className="border-b border-border pb-6 mb-6">
          <p className="text-[11px] text-text-disabled uppercase tracking-wide font-semibold mb-2 text-center">Frage</p>
          <p className="text-sm text-text-secondary text-center" dangerouslySetInnerHTML={{ __html: item.front }}></p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-[11px] text-text-disabled uppercase tracking-wide font-semibold mb-2 text-center">Antwort</p>
          <div className="text-[15px] text-text-primary text-center leading-relaxed prose prose-sm prose-blue" dangerouslySetInnerHTML={{ __html: item.back }}></div>
        </div>
      </div>
      
      <p className="text-[13px] text-text-secondary mb-4">Wie gut konntest du die Antwort abrufen?</p>
      
      <div className="grid grid-cols-4 gap-3 w-full">
        <button className="flex flex-col items-center p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors" onClick={() => handleScore(1)}>
          <span className="font-medium text-sm">Nochmal</span>
          <span className="text-[10px] opacity-80 mt-1">Komplett vergessen</span>
        </button>
        <button className="flex flex-col items-center p-3 rounded-lg border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors" onClick={() => handleScore(2)}>
          <span className="font-medium text-sm">Schwer</span>
          <span className="text-[10px] opacity-80 mt-1">Nur mit Mühe</span>
        </button>
        <button className="flex flex-col items-center p-3 rounded-lg border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition-colors" onClick={() => handleScore(3)}>
          <span className="font-medium text-sm">Gut</span>
          <span className="text-[10px] opacity-80 mt-1">Erinnert</span>
        </button>
        <button className="flex flex-col items-center p-3 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors" onClick={() => handleScore(4)}>
          <span className="font-medium text-sm">Einfach</span>
          <span className="text-[10px] opacity-80 mt-1">Sofort gewusst</span>
        </button>
      </div>
    </div>
  );
};
