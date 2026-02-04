'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Star, Loader2, Heart, Ban } from 'lucide-react';
import { submitReview } from '@/app/actions/reviews';
import { upsertWorkerRelation } from '@/app/actions/worker-relations';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

export type PendingTimesheetAction = 'approve' | 'dispute' | 'add_overtime';

interface TimesheetRatingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workerId: string;
  shiftId: string;
  companyId: string;
  workerName: string;
  firstName?: string;
  lastName?: string;
  lang: string;
  dict: {
    title: string;
    commentPlaceholder: string;
    save: string;
    skip: string;
  };
  pendingAction: PendingTimesheetAction;
  onSaveOrSkip: (action: PendingTimesheetAction, didRate: boolean) => Promise<void>;
}

export default function TimesheetRatingModal({
  open,
  onOpenChange,
  workerId,
  shiftId,
  companyId,
  workerName,
  firstName,
  lastName,
  lang,
  dict,
  pendingAction,
  onSaveOrSkip,
}: TimesheetRatingModalProps) {
  const { toast } = useToast();
  const displayName = firstName != null && lastName != null
    ? `${firstName} ${lastName}`.trim() || workerName
    : workerName;
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isBlacklist, setIsBlacklist] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRatingClick = (value: number) => {
    setRating(value);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1) {
      setError('Please select a rating');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      // Future Cooperation: upsert PRZED submitReview – zapisuje się nawet gdy opinia już istnieje
      if (isFavorite || isBlacklist) {
        const relResult = await upsertWorkerRelation({
          workerId,
          companyId,
          relationType: isBlacklist ? 'blacklist' : 'favorite',
          lang,
        });
        if (relResult.error) {
          toast({
            title: 'Relation update failed',
            description: relResult.error,
            variant: 'destructive',
          });
        }
      }

      const result = await submitReview({
        shiftId,
        workerId,
        rating,
        comment: comment.trim() || null,
        tags: null,
        lang,
        fromTimesheet: true,
      });

      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      toast({
        title: 'Opinion submitted!',
        description: 'Your review has been successfully added to the profile.',
        variant: 'success',
        duration: 5000,
      });
      await onSaveOrSkip(pendingAction, true);
      onOpenChange(false);
      setRating(0);
      setComment('');
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      await onSaveOrSkip(pendingAction, false);
      onOpenChange(false);
      setRating(0);
      setComment('');
      setError(null);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!loading) {
      onOpenChange(newOpen);
      if (!newOpen) {
        setRating(0);
        setComment('');
        setError(null);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md border border-black bg-white">
        <form onSubmit={handleSave}>
          <DialogHeader>
            <DialogTitle className="text-black">{dict.title}</DialogTitle>
            <DialogDescription className="text-gray-600">
              {displayName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Star Rating - Black stars */}
            <div className="space-y-2">
              <Label className="text-black">Rating</Label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = star <= (hoveredRating || rating);
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleRatingClick(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      disabled={loading}
                      className="transition-colors disabled:pointer-events-none cursor-pointer hover:opacity-80"
                    >
                      <Star
                        className={cn(
                          'h-8 w-8 transition-colors',
                          isFilled
                            ? 'fill-black stroke-black'
                            : 'fill-transparent stroke-black'
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Future Cooperation */}
            <div className="space-y-2">
              <Label className="text-black">Future Cooperation</Label>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={isFavorite ? 'default' : 'outline'}
                  size="sm"
                  disabled={loading}
                  onClick={() => {
                    setIsFavorite((p) => !p);
                    if (isBlacklist) setIsBlacklist(false);
                  }}
                  className={cn(
                    'gap-2',
                    isFavorite && 'bg-rose-500 hover:bg-rose-600'
                  )}
                >
                  <Heart className={cn('h-4 w-4', isFavorite && 'fill-current')} />
                  Favorite
                </Button>
                <Button
                  type="button"
                  variant={isBlacklist ? 'destructive' : 'outline'}
                  size="sm"
                  disabled={loading}
                  onClick={() => {
                    setIsBlacklist((p) => !p);
                    if (isFavorite) setIsFavorite(false);
                  }}
                  className="gap-2"
                >
                  <Ban className="h-4 w-4" />
                  Blacklist
                </Button>
              </div>
            </div>

            {/* Optional Comment */}
            <div className="space-y-2">
              <Label htmlFor="timesheet-rating-comment" className="text-black">
                Comment (optional)
              </Label>
              <Textarea
                id="timesheet-rating-comment"
                placeholder={dict.commentPlaceholder}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={loading}
                rows={3}
                className="border-black bg-white text-black placeholder:text-gray-500"
              />
            </div>

            {error && (
              <div className="rounded border border-black bg-gray-100 p-3 text-sm text-black">
                {error}
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col gap-3 sm:flex-col">
            <Button
              type="submit"
              variant="success"
              size="lg"
              disabled={loading || rating < 1}
              className="w-full text-base py-6"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {dict.save}...
                </>
              ) : (
                dict.save
              )}
            </Button>
            <button
              type="button"
              onClick={handleSkip}
              disabled={loading}
              className="text-sm text-gray-500 underline hover:text-gray-700 disabled:opacity-50"
            >
              {dict.skip}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
