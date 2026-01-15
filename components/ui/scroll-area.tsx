'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Minimal scroll area container suitable for dialog content.
 * Adds smooth scrolling and hides overflow outside the given height.
 */
export function ScrollArea({ className, ...props }: ScrollAreaProps) {
  return (
    <div
      className={cn(
        'relative overflow-y-auto',
        className
      )}
      {...props}
    />
  );
}

