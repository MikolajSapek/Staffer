import * as React from 'react';

import { cn } from '@/lib/utils';

type AlertVariant = 'default' | 'destructive' | 'warning';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
}

export function Alert({ className, variant = 'default', ...props }: AlertProps) {
  const baseClasses = 'w-full rounded-md border p-4 text-sm flex gap-3';
  let variantClasses: string;

  switch (variant) {
    case 'destructive':
      variantClasses = 'border-red-200 bg-red-50 text-red-800';
      break;
    case 'warning':
      variantClasses = 'border-amber-200 bg-amber-50 text-amber-900';
      break;
    default:
      variantClasses = 'border-slate-200 bg-slate-50 text-slate-900';
  }

  return (
    <div
      role="alert"
      className={cn(baseClasses, variantClasses, className)}
      {...props}
    />
  );
}

export interface AlertTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export function AlertTitle({ className, ...props }: AlertTitleProps) {
  return (
    <h5
      className={cn('font-medium leading-none tracking-tight', className)}
      {...props}
    />
  );
}

export interface AlertDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export function AlertDescription({ className, ...props }: AlertDescriptionProps) {
  return (
    <p
      className={cn('text-sm text-slate-700 dark:text-slate-200', className)}
      {...props}
    />
  );
}


