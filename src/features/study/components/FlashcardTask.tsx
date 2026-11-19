import React, { useState } from 'react';
import { Button } from '../../../components/Button';
import { useStore } from '../../../store';
import type { Flashcard, KnowledgeNode } from '../../../types';
import { sanitizeHtml } from '../../../utils/sanitize';

interface Props {
  node: KnowledgeNode;
  item: Flashcard;
  onNext: () => void;
}

export const FlashcardTask: React.FC<Props> = ({ node, item, onNext }) => {
  const [flipped, setFlipped] = useState(false);
  const [unmaskedBoxIds, setUnmaskedBoxIds] = useState<Set<string>>(new Set());
  const { reviewKnowledgeNode, recordLearningEvent } = useStore();

  const isOcclusion = item.cardType === 'occlusion' && !!item.imageUrl;

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

  const toggleBox = (id: string) => {
    setUnmaskedBoxIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!flipped) {
    return (
      <div className="flex flex-col items-center w-full">
        <div
          className="bg-bg-canvas border border-border rounded-xl p-6 sm:p-10 w-full min-h-[250px] shadow-sm flex flex-col items-center justify-center mb-6 cursor-pointer hover:border-blue-500 transition-colors"
          onClick={() => setFlipped(true)}
        >
          <p className="text-[13px] text-text-disabled uppercase tracking-wide font-semibold mb-3">
            {isOcclusion ? '🖼️ Bild-Okklusion' : 'Frage'}
          </p>
          <p
            className="text-lg text-text-primary text-center leading-relaxed mb-4"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.front) }}
          />

          {isOcclusion && item.imageUrl && (
            <div className="relative rounded-lg overflow-hidden border border-border max-h-[300px] w-full flex items-center justify-center bg-black/5">
              <img
                src={item.imageUrl}
                alt="Occlusion"
                className="max-h-[300px] w-full object-contain pointer-events-none"
              />
              {item.occlusionBoxes?.map((b, idx) => {
                const unmasked = unmaskedBoxIds.has(b.id);
                return (
                  <div
                    key={b.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBox(b.id);
                    }}
                    className={`absolute border-2 rounded text-[10px] flex items-center justify-center font-bold transition-all ${
                      unmasked
                        ? 'border-emerald-500 bg-white/95 text-emerald-950 px-1'
                        : 'border-amber-600 bg-amber-500 text-white animate-pulse'
                    }`}
                    style={{
                      left: `${b.x}%`,
                      top: `${b.y}%`,
                      width: `${b.width}%`,
                      height: `${b.height}%`,
                    }}
                  >
                    {unmasked ? b.label || `#${idx + 1}` : `? #${idx + 1}`}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <Button variant="primary" onClick={() => setFlipped(true)}>Antwort anzeigen</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full">
      <div className="bg-bg-canvas border border-border rounded-xl p-6 sm:p-10 w-full min-h-[250px] shadow-sm flex flex-col mb-6">
        <div className="border-b border-border pb-4 mb-4">
          <p className="text-[11px] text-text-disabled uppercase tracking-wide font-semibold mb-1 text-center">
            {isOcclusion ? '🖼️ Bild-Okklusion' : 'Frage'}
          </p>
          <p className="text-sm text-text-secondary text-center" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.front) }}></p>
        </div>

        {isOcclusion && item.imageUrl && (
          <div className="relative rounded-lg overflow-hidden border border-border max-h-[250px] w-full flex items-center justify-center bg-black/5 mb-4">
            <img
              src={item.imageUrl}
              alt="Occlusion"
              className="max-h-[250px] w-full object-contain pointer-events-none"
            />
            {item.occlusionBoxes?.map((b) => (
              <div
                key={b.id}
                className="absolute border-2 border-emerald-500 bg-white/95 text-emerald-950 font-bold text-[10px] px-1 rounded flex items-center justify-center"
                style={{
                  left: `${b.x}%`,
                  top: `${b.y}%`,
                  width: `${b.width}%`,
                  height: `${b.height}%`,
                }}
              >
                {b.label}
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-[11px] text-text-disabled uppercase tracking-wide font-semibold mb-2 text-center">Antwort</p>
          <div className="text-[15px] text-text-primary text-center leading-relaxed prose prose-sm prose-blue whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.back) }}></div>
        </div>
      </div>
      
      <p className="text-[13px] text-text-secondary mb-4">Wie gut konntest du die Antwort abrufen?</p>
      
      <div className="grid grid-cols-4 gap-3 w-full">
        <button className="flex flex-col items-center p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors" onClick={() => handleScore(1)}>
          <span className="font-medium text-sm">Nochmal</span>
          <span className="text-[11px] opacity-75">&lt; 1 min</span>
        </button>
        <button className="flex flex-col items-center p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors" onClick={() => handleScore(2)}>
          <span className="font-medium text-sm">Schwer</span>
          <span className="text-[11px] opacity-75">10 min</span>
        </button>
        <button className="flex flex-col items-center p-3 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors" onClick={() => handleScore(3)}>
          <span className="font-medium text-sm">Gut</span>
          <span className="text-[11px] opacity-75">1 Tag</span>
        </button>
        <button className="flex flex-col items-center p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors" onClick={() => handleScore(4)}>
          <span className="font-medium text-sm">Einfach</span>
          <span className="text-[11px] opacity-75">4 Tage</span>
        </button>
      </div>
    </div>
  );
};
