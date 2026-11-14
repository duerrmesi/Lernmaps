export interface Point {
  x: number;
  y: number;
}

export type DrawingTool = 'pen' | 'highlighter' | 'eraser';

export interface DrawingStroke {
  id: string;
  tool: DrawingTool;
  color: string;
  width: number;
  opacity: number;
  points: Point[];
}
