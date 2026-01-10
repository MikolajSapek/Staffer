'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Star, Loader2 } from 'lucide-react';
import { submitReview } from '@/app/actions/reviews';
import { cn } from '@/lib/utils';

interface RateWorkerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workerId: string;
  shiftId: string;
  workerName: string;
  existingReview?: {
    rating: number;
    comment: string | null;
    tags: string[] | null;
  } | null;
  lang: string;
  onReviewSubmitted?: () => void;
}

const TAG_OPTIONS = [
  { id: 'punctual', label: 'Punctual' },
  { id: 'hardworking', label: 'Hardworking' },
  { id: 'fast', label: 'Fast' },
  { id: 'reliable', label: 'Reliable' },
  { id: 'friendly', label: 'Friendly' },
  { id: 'skilled', label: 'Skilled' },
];

export default function RateWorkerDialog({
  open,
  onOpenChange,
  workerId,
  shiftId,
  workerName,
  existingReview,
  lang,
  onReviewSubmitted,
}: RateWorkerDialogProps) {
  const router = useRouter();
  const [rating, setRating] = useState<number>(existingReview?.rating || 0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comment, setComment] = useState<string>(existingReview?.comment || '');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAlreadyRated = !!existingReview;

  const handleRatingClick = (value: number) => {
    if (isAlreadyRated) return;
    setRating(value);
  };

  const handleTagToggle = (tagId: string) => {
    if (isAlreadyRated) return;
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // CRITICAL: Prevents the "message port closed" error

    if (isAlreadyRated) {
      onOpenChange(false);
      return;
    }

    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // Prepare comment - send null if empty
      const finalComment: string | null = comment.trim() || null;
      
      // Prepare tags - send tag labels as array, or null if empty
      const finalTags: string[] | null = selectedTags.length > 0
        ? selectedTags
            .map((tagId) => TAG_OPTIONS.find((t) => t.id === tagId)?.label)
            .filter(Boolean) as string[]
        : null;

      const result = await submitReview({
        shiftId,
        workerId,
        rating,
        comment: finalComment,
        tags: finalTags,
        lang,
      });

      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      // Success - close dialog and refresh only after successful submission
      setLoading(false);
      onOpenChange(false);
      if (onReviewSubmitted) {
        onReviewSubmitted();
      }
      router.refresh();
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleOpenChangeInternal = (newOpen: boolean) => {
    if (!loading) {
      onOpenChange(newOpen);
      if (!newOpen) {
        // Reset form when closing (unless already rated)
        if (!isAlreadyRated) {
          setRating(0);
          setComment('');
          setSelectedTags([]);
          setError(null);
        }
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChangeInternal}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isAlreadyRated ? `Review for ${workerName}` : `Rate ${workerName}`}
            </DialogTitle>
            <DialogDescription>
              {isAlreadyRated
                ? 'You have already submitted a review for this worker.'
                : 'Share your experience working with this worker.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="space-y-2">
            <Label>Rating *</Label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled =
                  star <= (hoveredRating || rating) && !isAlreadyRated;
                const isRated = star <= rating && isAlreadyRated;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleRatingClick(star)}
                    onMouseEnter={() => !isAlreadyRated && setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    disabled={isAlreadyRated || loading}
                    className={cn(
                      'transition-colors disabled:pointer-events-none',
                      !isAlreadyRated && 'cursor-pointer hover:scale-110'
                    )}
                  >
                    <Star
                      className={cn(
                        'h-8 w-8 transition-colors',
                        isFilled || isRated
                          ? 'fill-yellow-400 stroke-yellow-400'
                          : 'fill-muted stroke-muted',
                        !isAlreadyRated && 'hover:fill-yellow-300 hover:stroke-yellow-300'
                      )}
                    />
                  </button>
                );
              })}
              {rating > 0 && (
                <span className="ml-2 text-sm text-muted-foreground">
                  {rating} {rating === 1 ? 'star' : 'stars'}
                </span>
              )}
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">How was their work?</Label>
            <Textarea
              id="comment"
              placeholder="Share your experience working with this worker... (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={isAlreadyRated || loading}
              rows={4}
            />
          </div>

          {/* Optional Tags */}
          {!isAlreadyRated && (
            <div className="space-y-2">
              <Label>Tags (Optional)</Label>
              <div className="flex flex-wrap gap-2">
                {TAG_OPTIONS.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant={selectedTags.includes(tag.id) ? 'default' : 'outline'}
                    className={cn(
                      'cursor-pointer transition-colors',
                      !loading && 'hover:bg-primary hover:text-primary-foreground'
                    )}
                    onClick={() => handleTagToggle(tag.id)}
                  >
                    {tag.label}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Display existing review if already rated */}
          {isAlreadyRated && existingReview && (
            <div className="rounded-md border bg-muted/50 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Your Rating:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        'h-4 w-4',
                        star <= existingReview.rating
                          ? 'fill-yellow-400 stroke-yellow-400'
                          : 'fill-muted stroke-muted'
                      )}
                    />
                  ))}
                  <span className="text-sm text-muted-foreground ml-1">
                    {existingReview.rating}/5
                  </span>
                </div>
              </div>
              {existingReview.comment && (
                <div>
                  <span className="text-sm font-medium">Your Comment:</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    {existingReview.comment}
                  </p>
                </div>
              )}
              {/* Only render if tags exists and has items */}
              {existingReview.tags && existingReview.tags.length > 0 && (
                <div>
                  <span className="text-sm font-medium">Tags:</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {existingReview.tags.map((tag, index) => (
                      <Badge key={index} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChangeInternal(false)}
              disabled={loading}
            >
              {isAlreadyRated ? 'Close' : 'Cancel'}
            </Button>
            {!isAlreadyRated && (
              <Button type="submit" disabled={loading || rating === 0}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Review'
                )}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}