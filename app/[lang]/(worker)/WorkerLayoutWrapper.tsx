'use client';

import { WorkerSidebar } from '@/components/layout/WorkerSidebar';
import { WorkerHeader } from '@/components/layout/WorkerHeader';

interface WorkerLayoutWrapperProps {
  children: React.ReactNode;
  lang: string;
}

export default function WorkerLayoutWrapper({
  children,
  lang,
}: WorkerLayoutWrapperProps) {
  // Zabezpieczenie: jeśli lang jest undefined, użyj 'en-US'
  const currentLang = lang || 'en-US';
  
  // Debug (opcjonalnie, usuń po testach)
  if (!lang) {
    console.warn('WorkerLayoutWrapper: lang is missing, using fallback "en-US"');
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-20 border-r border-black bg-white h-full z-30">
        <WorkerSidebar lang={currentLang} />
      </aside>

      {/* Main Content + Header */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
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
