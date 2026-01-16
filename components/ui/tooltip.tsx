'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  className?: string;
}

export function Tooltip({ children, content, className }: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={cn(
            'absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-md shadow-lg',
            'whitespace-normal max-w-xs break-words',
            'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
            'before:content-[""] before:absolute before:top-full before:left-1/2 before:-translate-x-1/2',
            'before:border-4 before:border-transparent before:border-t-gray-900',
            className
          )}
          role="tooltip"
        >
          {content}
        </div>
      )}
    </div>
  );
}
