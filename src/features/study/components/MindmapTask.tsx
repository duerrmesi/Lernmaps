import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/Button';
import { useStore } from '../../../store';
import type { KnowledgeNode } from '../../../types';

interface Props {
  node: KnowledgeNode;
  childrenIds: string[];
  onNext: () => void;
}

export const MindmapTask: React.FC<Props> = ({ node, childrenIds, onNext }) => {
  const { knowledgeNodes, recordLearningEvent } = useStore();
  const childrenNodes = childrenIds.map(id => knowledgeNodes[id]).filter(Boolean);
  
  // Create state for inputs
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState<{correct: number, total: number} | null>(null);

  useEffect(() => {
    // Reset when node changes
    setAnswers({});
    setRevealed(false);
    setScore(null);
  }, [node.id]);

  const handleReveal = () => {
    let correctCount = 0;
    childrenNodes.forEach(child => {
      const ans = (answers[child.id] || '').trim().toLowerCase();
      const expected = child.title.trim().toLowerCase();
      // simple match or contains
      if (ans && (expected.includes(ans) || ans.includes(expected))) {
        correctCount++;
      }
    });

    const total = childrenNodes.length;
    setScore({ correct: correctCount, total });
    setRevealed(true);
  };

  const handleNext = () => {
    if (score) {
      const successRatio = score.correct / score.total;
      let result: 'correct' | 'incorrect' | 'partial' = 'correct';
      if (successRatio < 0.5) result = 'incorrect';
      else if (successRatio < 1) result = 'partial';
      
      recordLearningEvent(node.projectId, node.id, 'quiz', result, 'medium');
      childrenNodes.forEach(child => {
        const ans = (answers[child.id] || '').trim().toLowerCase();
        const expected = child.title.trim().toLowerCase();
        const childSuccess = ans && (expected.includes(ans) || ans.includes(expected));
        recordLearningEvent(node.projectId, child.id, 'quiz', childSuccess ? 'correct' : 'incorrect', 'medium');
      });
    }
    onNext();
  };

  if (!revealed) {
    return (
      <div className="flex flex-col items-center w-full">
        <div className="bg-bg-canvas border border-border rounded-xl p-8 w-full shadow-sm flex flex-col mb-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] text-purple-500 uppercase font-semibold">Leere Mindmap</span>
            <span className="text-[11px] text-text-disabled">{childrenNodes.length} Begriffe</span>
          </div>
          <h3 className="text-[15px] font-medium text-text-primary mb-6">Ergänze die fehlenden Unterthemen von <span className="font-bold">{node.title}</span>:</h3>
          
          <div className="flex flex-col items-center">
            {/* Root Node */}
            <div className="bg-blue-100 text-blue-900 px-4 py-2 rounded-lg font-semibold mb-6 border border-blue-200 shadow-sm z-10">
              {node.title}
            </div>
            
            {/* Connecting line */}
            <div className="w-px h-6 bg-border -mt-6 mb-0 z-0"></div>
            
            {/* Children container */}
            <div className="flex flex-wrap justify-center gap-4 border-t border-border pt-4 px-4 w-full relative">
               <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-px bg-border -mt-px"></div>
               {childrenNodes.map(child => (
                 <div key={child.id} className="flex flex-col items-center">
                   <div className="w-px h-4 bg-border mb-0"></div>
                   <input 
                     type="text"
                     placeholder="???"
                     className="px-3 py-1.5 text-[13px] border border-blue-300 rounded-lg text-center w-32 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                     value={answers[child.id] || ''}
                     onChange={e => setAnswers(prev => ({...prev, [child.id]: e.target.value}))}
                   />
                 </div>
               ))}
            </div>
          </div>
        </div>
        <Button variant="primary" onClick={handleReveal}>Lösung überprüfen</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full">
      <div className="bg-bg-canvas border border-border rounded-xl p-8 w-full shadow-sm flex flex-col mb-6">
        <h3 className="text-[15px] font-medium text-text-primary mb-6 text-center">Ergebnis: {score?.correct} / {score?.total} richtig</h3>
        
        <div className="flex flex-col items-center">
          <div className="bg-blue-100 text-blue-900 px-4 py-2 rounded-lg font-semibold mb-6 border border-blue-200">
            {node.title}
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 border-t border-border pt-4 w-full relative">
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-px bg-border -mt-px"></div>
             {childrenNodes.map(child => {
               const ans = (answers[child.id] || '').trim().toLowerCase();
               const expected = child.title.trim().toLowerCase();
               const childSuccess = ans && (expected.includes(ans) || ans.includes(expected));
               
               return (
                 <div key={child.id} className="flex flex-col items-center">
                   <div className="w-px h-4 bg-border mb-0"></div>
                   <div className={`px-3 py-1.5 text-[13px] border rounded-lg text-center w-32 ${childSuccess ? 'bg-green-100 border-green-300 text-green-900' : 'bg-red-100 border-red-300 text-red-900'}`}>
                     {child.title}
                   </div>
                   {!childSuccess && (
                     <div className="text-[10px] text-text-disabled mt-1 max-w-[120px] truncate">
                       Du: {answers[child.id] || '---'}
                     </div>
                   )}
                 </div>
               );
             })}
          </div>
        </div>
      </div>
      
      <Button variant="primary" onClick={handleNext}>Weiter</Button>
    </div>
  );
};
