import React from 'react';
import { cn } from '../utils/cn';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      {icon && (
        <div className="mb-3 text-text-disabled">
          {icon}
        </div>
      )}
      <p className="text-ui font-medium text-text-secondary mb-1">{title}</p>
      {description && (
        <p className="text-sm text-text-disabled max-w-xs mb-4">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
};
