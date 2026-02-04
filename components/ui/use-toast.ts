'use client';

import * as React from 'react';

type ToastVariant = 'default' | 'destructive' | 'success';

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
    toastEl.style.padding = '1rem';
    toastEl.style.borderRadius = '0.5rem';
    toastEl.style.boxShadow = '0 25px 50px -12px rgb(0 0 0 / 0.25)';
    toastEl.style.display = 'flex';
    toastEl.style.flexDirection = 'column';
    toastEl.style.gap = '0.25rem';
    toastEl.style.fontSize = '0.875rem';
    toastEl.style.cursor = 'pointer';
    toastEl.style.backgroundColor = '#ffffff';
    toastEl.style.color = '#0f172a';
    toastEl.style.borderTop = '1px solid #e2e8f0';
    toastEl.style.borderRight = '1px solid #e2e8f0';
    toastEl.style.borderBottom = '1px solid #e2e8f0';
    toastEl.style.transform = 'translateX(100%)';
    toastEl.style.opacity = '0';
    toastEl.style.transition = 'opacity 200ms ease-out, transform 250ms cubic-bezier(0.32, 0.72, 0, 1)';

    const leftBorderColor = variant === 'destructive'
      ? '#ef4444'
      : variant === 'success'
        ? '#22c55e'
        : '#64748b';
    toastEl.style.borderLeft = `4px solid ${leftBorderColor}`;

    if (title) {
      const titleRow = document.createElement('div');
      titleRow.style.display = 'flex';
      titleRow.style.alignItems = 'center';
      titleRow.style.gap = '0.5rem';

      if (variant === 'success') {
        const checkSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        checkSvg.setAttribute('width', '20');
        checkSvg.setAttribute('height', '20');
        checkSvg.setAttribute('viewBox', '0 0 24 24');
        checkSvg.setAttribute('fill', 'none');
        checkSvg.setAttribute('stroke', 'currentColor');
        checkSvg.setAttribute('stroke-width', '2');
        checkSvg.setAttribute('stroke-linecap', 'round');
        checkSvg.setAttribute('stroke-linejoin', 'round');
        checkSvg.style.flexShrink = '0';
        checkSvg.style.color = '#22c55e';
        const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        polyline.setAttribute('points', '20 6 9 17 4 12');
        checkSvg.appendChild(polyline);
        titleRow.appendChild(checkSvg);
      }

      const titleEl = document.createElement('div');
      titleEl.style.fontWeight = '600';
      titleEl.style.color = '#0f172a';
      titleEl.textContent = title;
      titleRow.appendChild(titleEl);
      toastEl.appendChild(titleRow);
    }

    if (description) {
      const descEl = document.createElement('div');
      descEl.style.fontSize = '0.8125rem';
      descEl.style.color = '#64748b';
      descEl.textContent = description;
      toastEl.appendChild(descEl);
    }

    const remove = () => {
      toastEl.style.opacity = '0';
      toastEl.style.transform = 'translateX(100%)';
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

    // Animate in: płynne wsuwanie z prawej
    window.requestAnimationFrame(() => {
      toastEl.style.opacity = '1';
      toastEl.style.transform = 'translateX(0)';
    });

    window.setTimeout(remove, duration);
  }, []);

  // Expose dismiss function for manual control
  const dismiss = React.useCallback(() => {
    dismissAllToasts();
  }, []);

  return { toast, dismiss };
}

