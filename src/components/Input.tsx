import React, { forwardRef } from 'react';
import { cn } from '../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-[10.5px] font-semibold uppercase tracking-wider text-text-secondary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'h-7 w-full rounded border border-border-strong bg-white px-2.5 text-ui text-text-primary',
            'placeholder:text-text-disabled',
            'focus:outline-none focus:border-accent',
            'transition-colors',
            error && 'border-danger focus:border-danger',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-[10.5px] font-semibold uppercase tracking-wider text-text-secondary">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn(
            'w-full rounded border border-border-strong bg-white px-2.5 py-2 text-ui text-text-primary',
            'placeholder:text-text-disabled',
            'focus:outline-none focus:border-accent',
            'transition-colors resize-none',
            error && 'border-danger focus:border-danger',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
