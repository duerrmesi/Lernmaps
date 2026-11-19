import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
  size = 'md',
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/35" />
      <div
        className={cn(
          'relative z-10 w-full mx-3 sm:mx-0 max-h-[92vh] flex flex-col bg-white border border-border rounded shadow-modal overflow-hidden',
          'animate-fade-in',
          sizes[size],
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <h2 className="text-[13px] font-semibold text-text-primary tracking-tight">{title}</h2>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0 cursor-pointer">
              <X size={14} />
            </Button>
          </div>
        )}
        <div className="p-4 overflow-y-auto scrollbar-thin">{children}</div>
      </div>
    </div>
  );
};
