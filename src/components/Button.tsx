import React from 'react';
import { cn } from '../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  className,
  children,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center gap-1.5 font-medium transition-colors focus-ring rounded select-none whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed';

  const variants = {
    primary:
      'bg-[#0D0D0D] text-white hover:bg-[#282828] active:bg-[#0a0a0a]',
    secondary:
      'bg-white text-text-primary border border-border hover:border-border-strong hover:bg-bg-secondary active:bg-bg-tertiary',
    ghost:
      'text-text-secondary hover:text-text-primary hover:bg-bg-secondary active:bg-bg-tertiary',
    danger:
      'text-danger border border-danger/25 hover:bg-danger-light hover:border-danger/50 active:bg-danger-light',
  };

  const sizes = {
    sm: 'h-6 px-2 text-[11.5px] tracking-[-0.005em]',
    md: 'h-7 px-2.5 text-[12.5px] tracking-[-0.005em]',
    lg: 'h-8 px-3 text-[13px]',
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
};
