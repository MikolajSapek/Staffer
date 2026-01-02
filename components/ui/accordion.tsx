'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccordionContextValue {
  value: string | null;
  onValueChange: (value: string | null) => void;
  type: 'single' | 'multiple';
}

const AccordionContext = React.createContext<AccordionContextValue | undefined>(undefined);

interface AccordionProps {
  type?: 'single' | 'multiple';
  collapsible?: boolean;
  value?: string | string[];
  onValueChange?: (value: string | string[] | null) => void;
  className?: string;
  children: React.ReactNode;
}

const Accordion = React.forwardRef<HTMLDivElement, AccordionProps>(
  ({ type = 'single', collapsible = false, value: controlledValue, onValueChange, className, children, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState<string | string[] | null>(
      type === 'single' ? null : []
    );
    const isControlled = controlledValue !== undefined;
    const value = isControlled ? controlledValue : internalValue;

    const handleValueChange = React.useCallback(
      (newValue: string | null) => {
        if (type === 'single') {
          const finalValue = collapsible && (value === newValue) ? null : newValue;
          if (isControlled) {
            onValueChange?.(finalValue as string | null);
          } else {
            setInternalValue(finalValue);
          }
        } else {
          const currentArray = (Array.isArray(value) ? value : []) as string[];
          const newArray = currentArray.includes(newValue!)
            ? currentArray.filter((v) => v !== newValue)
            : [...currentArray, newValue!];
          if (isControlled) {
            onValueChange?.(newArray);
          } else {
            setInternalValue(newArray);
          }
        }
      },
      [type, collapsible, value, isControlled, onValueChange]
    );

    const contextValue = React.useMemo(
      () => ({
        value: type === 'single' ? (value as string | null) : null,
        onValueChange: handleValueChange,
        type,
      }),
      [value, handleValueChange, type]
    );

    return (
      <AccordionContext.Provider value={contextValue}>
        <div ref={ref} className={cn('w-full', className)} {...props}>
          {children}
        </div>
      </AccordionContext.Provider>
    );
  }
);
Accordion.displayName = 'Accordion';

interface AccordionItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ className, value, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('border-b', className)}
        data-accordion-item={value}
        {...props}
      />
    );
  }
);
AccordionItem.displayName = 'AccordionItem';

interface AccordionTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

const AccordionTrigger = React.forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(AccordionContext);
    if (!context) throw new Error('AccordionTrigger must be used within Accordion');

    const itemElement = React.useRef<HTMLElement | null>(null);
    React.useEffect(() => {
      if (ref && 'current' in ref) {
        itemElement.current = (ref as React.RefObject<HTMLElement>).current?.closest('[data-accordion-item]') || null;
      }
    }, [ref]);

    const itemValue = itemElement.current?.getAttribute('data-accordion-item') || '';
    const isOpen = context.value === itemValue;

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline',
          className
        )}
        onClick={() => context.onValueChange(itemValue)}
        aria-expanded={isOpen}
        {...props}
      >
        {children}
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>
    );
  }
);
AccordionTrigger.displayName = 'AccordionTrigger';

interface AccordionContentProps extends React.HTMLAttributes<HTMLDivElement> {
  forceMount?: boolean;
}

const AccordionContent = React.forwardRef<HTMLDivElement, AccordionContentProps>(
  ({ className, children, forceMount, ...props }, ref) => {
    const context = React.useContext(AccordionContext);
    if (!context) throw new Error('AccordionContent must be used within Accordion');

    const itemElement = React.useRef<HTMLElement | null>(null);
    const contentRef = React.useRef<HTMLDivElement>(null);
    React.useImperativeHandle(ref, () => contentRef.current!);

    React.useEffect(() => {
      if (contentRef.current) {
        itemElement.current = contentRef.current.closest('[data-accordion-item]');
      }
    }, []);

    const itemValue = itemElement.current?.getAttribute('data-accordion-item') || '';
    const isOpen = context.value === itemValue || forceMount;

    return (
      <div
        ref={contentRef}
        className={cn(
          'overflow-hidden text-sm transition-all duration-200',
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0',
          className
        )}
        {...props}
      >
        <div className={cn('pb-4 pt-0', !isOpen && 'hidden')}>{children}</div>
      </div>
    );
  }
);
AccordionContent.displayName = 'AccordionContent';

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };

