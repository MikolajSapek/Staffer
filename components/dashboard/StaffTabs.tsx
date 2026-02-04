'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Heart, UserX, Loader2, Trash2, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  removeWorkerRelation,
  moveWorkerRelation,
  type RelationType,
} from '@/app/actions/worker-relations';
import { cn } from '@/lib/utils';

export interface StaffWorker {
  id: string;
  worker_id: string;
  relation_type: 'favorite' | 'blacklist';
  created_at: string | null;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
}

interface StaffTabsProps {
  favorites: StaffWorker[];
  blacklist: StaffWorker[];
  companyId: string;
  lang: string;
  dict?: {
    staff?: string;
    favorites?: string;
    blacklist?: string;
    removeFromList?: string;
    moveToFavorites?: string;
    moveToBlacklist?: string;
    noFavorites?: string;
    noBlacklist?: string;
    removed?: string;
    moved?: string;
  };
}

export default function StaffTabs({
  favorites,
  blacklist,
  companyId,
  lang,
  dict = {},
}: StaffTabsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'favorites' | 'blacklist'>('favorites');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const removeLabel = dict.removeFromList ?? 'Remove from list';
  const moveToFavLabel = dict.moveToFavorites ?? 'Move to Favorites';
  const moveToBlackLabel = dict.moveToBlacklist ?? 'Move to Blacklist';
  const noFavLabel = dict.noFavorites ?? 'No favorites yet.';
  const noBlackLabel = dict.noBlacklist ?? 'No workers on blacklist.';

  const handleRemove = async (workerId: string) => {
    setProcessingId(workerId);
    try {
      const result = await removeWorkerRelation({ workerId, companyId, lang });
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      } else {
        toast({
          title: dict.removed ?? 'Removed',
          description: 'Worker has been removed from the list.',
          variant: 'success',
        });
        router.refresh();
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleMove = async (workerId: string, toType: RelationType) => {
    setProcessingId(workerId);
    try {
      const result = await moveWorkerRelation({
        workerId,
        companyId,
        toRelationType: toType,
        lang,
      });
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      } else {
        toast({
          title: dict.moved ?? 'Moved',
          description: `Worker has been moved to ${toType === 'favorite' ? 'Favorites' : 'Blacklist'}.`,
          variant: 'success',
        });
        router.refresh();
      }
    } finally {
      setProcessingId(null);
    }
  };

  const formatAddedDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return null;
    }
  };

  const renderWorkerCard = (worker: StaffWorker, isBlacklist: boolean) => {
    const fullName = `${worker.first_name} ${worker.last_name}`.trim() || 'Unknown';
    const initials = worker.first_name && worker.last_name
      ? `${worker.first_name.charAt(0)}${worker.last_name.charAt(0)}`.toUpperCase()
      : '??';
    const isProcessing = processingId === worker.worker_id;
    const addedDate = formatAddedDate(worker.created_at);
    const moveLabel = isBlacklist ? moveToFavLabel : moveToBlackLabel;

    return (
      <div
        key={worker.worker_id}
        className={cn(
          'bg-card border rounded-xl p-5 shadow-sm hover:shadow-md transition-all min-w-0',
          isBlacklist && 'opacity-70'
        )}
      >
        <div className="flex items-center justify-between gap-4">
          {/* LEWA STRONA: Avatar + Imię + Data */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Avatar className="h-12 w-12 flex-shrink-0">
              <AvatarImage src={worker.avatar_url || undefined} alt={fullName} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-bold text-base break-words">{fullName}</span>
              {addedDate && (
                <span className="text-xs text-muted-foreground">Added on {addedDate}</span>
              )}
            </div>
          </div>
          {/* PRAWA STRONA: Przyciski akcji */}
          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              disabled={isProcessing}
              onClick={() => handleRemove(worker.worker_id)}
              className="h-9 px-2 md:px-3 text-muted-foreground hover:text-red-600 hover:bg-red-50"
              title={removeLabel}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              <span className="hidden md:inline ml-1.5">Remove</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={isProcessing}
              onClick={() => handleMove(worker.worker_id, isBlacklist ? 'favorite' : 'blacklist')}
              className="h-9 px-2 md:px-3"
              title={moveLabel}
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden md:inline ml-1.5">{isBlacklist ? 'To Favorites' : 'To Blacklist'}</span>
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const currentList = activeTab === 'favorites' ? favorites : blacklist;
  const isEmpty = !currentList || currentList.length === 0;
  const emptyMessage = activeTab === 'favorites' ? noFavLabel : noBlackLabel;

  return (
    <div>
      <div className="flex gap-2 mb-6 border-b">
        <Button
          variant={activeTab === 'favorites' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('favorites')}
          className="rounded-b-none"
        >
          <Heart className="h-4 w-4 mr-2" />
          {dict.favorites ?? 'Favorites'}
          {favorites.length > 0 && (
            <span className="ml-2 text-xs opacity-75">({favorites.length})</span>
          )}
        </Button>
        <Button
          variant={activeTab === 'blacklist' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('blacklist')}
          className="rounded-b-none"
        >
          <UserX className="h-4 w-4 mr-2" />
          {dict.blacklist ?? 'Blacklist'}
          {blacklist.length > 0 && (
            <span className="ml-2 text-xs opacity-75">({blacklist.length})</span>
          )}
        </Button>
      </div>

      {isEmpty ? (
        <div className="bg-card border rounded-xl p-12 text-center">
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {currentList.map((worker) =>
            renderWorkerCard(worker, activeTab === 'blacklist')
          )}
        </div>
      )}
    </div>
  );
}
