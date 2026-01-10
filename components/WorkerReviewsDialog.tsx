'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Star, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { formatDateTime } from '@/lib/date-utils';
import { cn } from '@/lib/utils';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  tags: string[] | null;
  created_at: string;
  reviewer: {
    id: string;
    company_details: {
      company_name: string;
      logo_url: string | null;
    } | null;
  } | null;
}

interface WorkerReviewsDialogProps {
  workerId: string;
  workerName: string;
  children: React.ReactNode;
}

export default function WorkerReviewsDialog({
  workerId,
  workerName,
  children,
}: WorkerReviewsDialogProps) {
  const [open, setOpen] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && workerId) {
      fetchReviews();
    }
  }, [open, workerId]);

  const fetchReviews = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          tags,
          created_at,
          reviewer:profiles!reviews_reviewer_id_fkey (
            id,
            company_details (
              company_name,
              logo_url
            )
          )
        `)
        .eq('reviewee_id', workerId)
        .order('created_at', { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      setReviews((data as Review[]) || []);
    } catch (err) {
      setError('Failed to load reviews. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getCompanyName = (review: Review): string => {
    return review.reviewer?.company_details?.company_name || 'Company';
  };

  const getCompanyLogo = (review: Review): string | null => {
    return review.reviewer?.company_details?.logo_url || null;
  };

  const getCompanyInitials = (review: Review): string => {
    const companyName = getCompanyName(review);
    return companyName
      .split(' ')
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'CO';
  };

  return (
    <>
      <div
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="cursor-pointer hover:opacity-80 transition-opacity"
        title="Click to read reviews"
      >
        {children}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Reviews for {workerName}</DialogTitle>
            <DialogDescription>
              {reviews.length === 0
                ? 'No reviews available'
                : `${reviews.length} review${reviews.length === 1 ? '' : 's'}`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive text-center">
                {error}
              </div>
            ) : reviews.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <p>No written reviews yet.</p>
              </div>
            ) : (
              <div className="space-y-4 pr-2">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-lg border bg-card p-4 space-y-3"
                  >
                    {/* Top: Reviewer Name + Date */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={getCompanyLogo(review) || undefined}
                            alt={getCompanyName(review)}
                          />
                          <AvatarFallback className="text-xs">
                            {getCompanyInitials(review)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">
                            {getCompanyName(review)}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateTime(review.created_at)}
                      </div>
                    </div>

                    {/* Middle: Star Rating */}
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={cn(
                            'h-4 w-4',
                            star <= review.rating
                              ? 'fill-yellow-400 stroke-yellow-400'
                              : 'fill-muted stroke-muted'
                          )}
                        />
                      ))}
                      <span className="text-xs text-muted-foreground ml-1">
                        {review.rating}/5
                      </span>
                    </div>

                    {/* Bottom: Comment */}
                    {review.comment && (
                      <div>
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {review.comment}
                        </p>
                      </div>
                    )}

                    {/* Tags Badge */}
                    {review.tags && review.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {review.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
