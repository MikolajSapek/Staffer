'use client';

import * as React from 'react';

type ToastVariant = 'default' | 'destructive';

export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

// Maximum number of visible toasts at once
const MAX_VISIBLE_TOASTS = 1;

/**
 * Dismiss all existing toasts immediately
 */
function dismissAllToasts() {
  if (typeof document === 'undefined') return;
  
  const container = document.getElementById('app-toast-container');
  if (container) {
    // Remove all child elements immediately
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
  }
}

/**
 * Minimal, self-contained toast helper inspired by shadcn/ui.
 * Renders toasts into a fixed container attached to document.body.
 * - Position: bottom-right
 * - Max visible toasts: 1 (previous toasts are dismissed)
 */
export function useToast() {
  const toast = React.useCallback((options: ToastOptions) => {
    if (typeof document === 'undefined') return;

    const {
      title,
      description,
      variant = 'default',
      duration = 4000,
    } = options;

    // Dismiss all existing toasts before showing new one (limit to 1)
    dismissAllToasts();

    // Ensure container exists
    let container = document.getElementById('app-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'app-toast-container';
      container.style.position = 'fixed';
      container.style.right = '1rem';
      container.style.bottom = '1rem';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.gap = '0.5rem';
      container.style.zIndex = '9999';
      document.body.appendChild(container);
    }

    const toastEl = document.createElement('div');
    toastEl.style.minWidth = '260px';
    toastEl.style.maxWidth = '360px';
    toastEl.style.padding = '0.75rem 1rem';
    toastEl.style.borderRadius = '0.5rem';
    toastEl.style.boxShadow = '0 10px 15px -3px rgba(15,23,42,0.25)';
    toastEl.style.display = 'flex';
    toastEl.style.flexDirection = 'column';
    toastEl.style.gap = '0.25rem';
    toastEl.style.fontSize = '0.875rem';
    toastEl.style.cursor = 'pointer';
    toastEl.style.opacity = '0';
    toastEl.style.transform = 'translateY(8px)';
    toastEl.style.transition = 'opacity 150ms ease-out, transform 150ms ease-out';

    if (variant === 'destructive') {
      toastEl.style.backgroundColor = '#fee2e2'; // red-100
      toastEl.style.color = '#991b1b'; // red-800
      toastEl.style.border = '1px solid #fecaca'; // red-200
    } else {
      toastEl.style.backgroundColor = '#0f172a'; // slate-900
      toastEl.style.color = '#e5e7eb'; // gray-200
      toastEl.style.border = '1px solid rgba(148,163,184,0.4)'; // slate-400/40
    }

    if (title) {
      const titleEl = document.createElement('div');
      titleEl.style.fontWeight = '600';
      titleEl.textContent = title;
      toastEl.appendChild(titleEl);
    }

    if (description) {
      const descEl = document.createElement('div');
      descEl.style.fontSize = '0.8125rem';
      descEl.style.opacity = '0.9';
      descEl.textContent = description;
      toastEl.appendChild(descEl);
    }

    const remove = () => {
      toastEl.style.opacity = '0';
      toastEl.style.transform = 'translateY(8px)';
      window.setTimeout(() => {
        if (toastEl.parentNode === container) {
          container?.removeChild(toastEl);
        }
        if (container && container.childElementCount === 0) {
          container.remove();
        }
      }, 150);
    };

    toastEl.addEventListener('click', remove);

    container.appendChild(toastEl);

    // Animate in on next frame
    window.requestAnimationFrame(() => {
      toastEl.style.opacity = '1';
      toastEl.style.transform = 'translateY(0)';
    });

    window.setTimeout(remove, duration);
  }, []);

  // Expose dismiss function for manual control
  const dismiss = React.useCallback(() => {
    dismissAllToasts();
  }, []);

  return { toast, dismiss };
}

