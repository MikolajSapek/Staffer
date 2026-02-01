'use client';

import { WorkerSidebar } from '@/components/layout/WorkerSidebar';
import { WorkerHeader } from '@/components/layout/WorkerHeader';

interface WorkerLayoutWrapperProps {
  children: React.ReactNode;
  lang: string;
  dict: Record<string, unknown>;
}

export default function WorkerLayoutWrapper({
  children,
  lang,
  dict,
}: WorkerLayoutWrapperProps) {
  const currentLang = lang || 'en-US';

  if (!lang) {
    console.warn('WorkerLayoutWrapper: lang is missing, using fallback "en-US"');
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 w-64 h-full border-r border-black/10 bg-white z-30">
        <WorkerSidebar dict={dict} lang={currentLang} />
      </aside>

      <div className="flex-1 flex flex-col h-full overflow-hidden lg:pl-64">
        <header className="flex-shrink-0 z-20">
          <WorkerHeader lang={currentLang} />
        </header>
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
