'use client';

import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

interface PasswordRequirementsProps {
  password: string;
  requirements?: PasswordRequirement[];
  className?: string;
  title?: string;
  lang?: string;
}

// Default password requirements (English)
export const getDefaultRequirements = (lang?: string): PasswordRequirement[] => {
  if (lang === 'da') {
    return [
      {
        label: 'Mindst 8 tegn',
        test: (password) => password.length >= 8,
      },
      {
        label: 'Et lille bogstav (a-z)',
        test: (password) => /[a-z]/.test(password),
      },
      {
        label: 'Et stort bogstav (A-Z)',
        test: (password) => /[A-Z]/.test(password),
      },
      {
        label: 'Et tal (0-9)',
        test: (password) => /[0-9]/.test(password),
      },
      {
        label: 'Et specialtegn (!@#$...)',
        test: (password) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      },
    ];
  }
  
  // English (default)
  return [
    {
      label: 'At least 8 characters',
      test: (password) => password.length >= 8,
    },
    {
      label: 'One lowercase letter (a-z)',
      test: (password) => /[a-z]/.test(password),
    },
    {
      label: 'One uppercase letter (A-Z)',
      test: (password) => /[A-Z]/.test(password),
    },
    {
      label: 'One number (0-9)',
      test: (password) => /[0-9]/.test(password),
    },
    {
      label: 'One special character (!@#$...)',
      test: (password) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    },
  ];
};

export function PasswordRequirements({
  password,
  requirements,
  className,
  title,
  lang,
}: PasswordRequirementsProps) {
  const reqs = requirements || getDefaultRequirements(lang);
  const defaultTitle = lang === 'da' ? 'Krav til adgangskode:' : 'Password requirements:';
  
  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-sm font-medium text-muted-foreground">
        {title || defaultTitle}
      </p>
      <ul className="space-y-1.5">
        {reqs.map((requirement, index) => {
          const isMet = requirement.test(password);
          return (
            <li
              key={index}
              className={cn(
                'flex items-center gap-2 text-sm transition-colors',
                isMet ? 'text-green-600' : 'text-muted-foreground'
              )}
            >
              {isMet ? (
                <Check className="h-4 w-4 flex-shrink-0" />
              ) : (
                <X className="h-4 w-4 flex-shrink-0 text-gray-400" />
              )}
              <span>{requirement.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Helper function to validate password against all requirements
export function validatePassword(password: string, requirements?: PasswordRequirement[]): boolean {
  const reqs = requirements || getDefaultRequirements();
  return reqs.every((req) => req.test(password));
}

// Helper function to get password validation regex
export function getPasswordRegex(): RegExp {
  // At least 8 characters, 1 lowercase, 1 uppercase, 1 number, 1 special character
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
}
