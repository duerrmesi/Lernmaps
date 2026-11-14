import React, { useState } from 'react';
import { Button } from '../../../components/Button';
import { useStore } from '../../../store';
import type { KnowledgeNode, Question } from '../../../types';

interface Props {
  node: KnowledgeNode;
  item: Question;
  onNext: () => void;
}

export const QuestionTask: React.FC<Props> = ({ node, item, onNext }) => {
  const [answer, setAnswer] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const { recordLearningEvent, logMistake } = useStore();

  const handleReveal = () => {
    if (!answer.trim()) return;
    setRevealed(true);
  };

  const handleScore = () => {
    const successRatio = score / item.points;
    let result: 'correct' | 'incorrect' | 'partial' = 'correct';
    if (successRatio < 0.5) result = 'incorrect';
    else if (successRatio < 1) result = 'partial';
    
    recordLearningEvent(node.projectId, node.id, 'question', result, item.difficulty || 'medium');
    if (result === 'incorrect') {
      logMistake(node.projectId, node.id, `Frage falsch beantwortet: ${item.question}`, 'Verständnis', item.id);
    }
    onNext();
  };

  if (!revealed) {
    return (
      <div className="flex flex-col items-center w-full">
        <div className="bg-bg-canvas border border-border rounded-xl p-8 w-full shadow-sm flex flex-col mb-6">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[11px] text-text-disabled">{item.type}</span>
            <span className="text-[11px] text-text-disabled">·</span>
            <span className="text-[11px] text-text-disabled">{item.points} Punkte</span>
          </div>
          <h3 className="text-[15px] font-medium text-text-primary mb-6">{item.question}</h3>
          <textarea 
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            className="w-full text-[13px] bg-bg-secondary border border-border rounded-lg px-4 py-3 text-text-primary resize-none"
            rows={5}
            placeholder="Deine Antwort hier..."
          />
        </div>
        <Button variant="primary" onClick={handleReveal} disabled={!answer.trim()}>Musterlösung anzeigen</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full">
      <div className="bg-bg-canvas border border-border rounded-xl p-8 w-full shadow-sm flex flex-col mb-6">
        <h3 className="text-[14px] font-medium text-text-primary mb-4">{item.question}</h3>
        <div className="border-l-2 border-blue-500 pl-4 py-1 mb-6">
          <p className="text-[11px] text-text-disabled uppercase font-semibold mb-1">Deine Antwort</p>
          <p className="text-[13px] text-text-primary whitespace-pre-wrap">{answer}</p>
        </div>
        <div className="bg-bg-tertiary rounded-lg p-4 border border-border">
          <p className="text-[11px] text-text-disabled uppercase font-semibold mb-2">Musterlösung</p>
          <p className="text-[13px] text-text-primary whitespace-pre-wrap">{item.answer}</p>
        </div>
      </div>
      
      <p className="text-[13px] text-text-secondary mb-3">Wie viele Punkte gibst du dir? (Max {item.points})</p>
      
      <div className="flex items-center gap-4 w-full mb-6">
        <span className="text-[13px] text-text-disabled">0</span>
        <input 
          type="range" 
          min={0} 
          max={item.points} 
          value={score} 
          onChange={e => setScore(parseInt(e.target.value))} 
          className="flex-1"
        />
        <span className="text-[14px] font-medium text-text-primary">{score} Pkt</span>
      </div>

      <Button variant="primary" onClick={handleScore}>Auswertung speichern & Weiter</Button>
    </div>
  );
};
