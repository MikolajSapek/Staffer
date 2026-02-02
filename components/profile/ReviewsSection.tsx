'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import { formatDateTime } from '@/lib/date-utils';
import { cn } from '@/lib/utils';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  tags: string[] | null;
  created_at: string;
  company_name?: string | null;
  company_logo?: string | null;
  reviewer?: {
    company_details?: {
      company_name?: string;
      logo_url?: string | null;
    };
  } | null;
}

interface ReviewsSectionProps {
  reviews: Review[];
  reviewsLoading: boolean;
}

export default function ReviewsSection({ reviews, reviewsLoading }: ReviewsSectionProps) {
  return (
    <div className="mt-8">
      <Card>
        <CardHeader>
          <CardTitle>Reviews & Feedback</CardTitle>
          <CardDescription>
            Feedback from companies you've worked with
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reviewsLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              Loading reviews...
            </div>
          ) : reviews.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <p>No reviews yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => {
                const companyName = review.company_name ?? review.reviewer?.company_details?.company_name ?? 'Anonymous Company';
                const companyLogo = review.company_logo ?? review.reviewer?.company_details?.logo_url ?? null;
                const companyInitials = companyName
                  .split(' ')
                  .map((word: string) => word.charAt(0))
                  .join('')
                  .toUpperCase()
                  .slice(0, 2) || 'CO';

                return (
                  <div
                    key={review.id}
                    className="rounded-lg border bg-card p-4 space-y-3"
                  >
                    {/* Header: Company Name + Date (reviewee_id=worker, reviewer_id=company) */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={companyLogo || undefined}
                            alt={companyName}
                          />
                          <AvatarFallback className="text-xs">
                            {companyInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm" title={companyName}>
                            {companyName}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateTime(review.created_at)}
                      </div>
                    </div>

                    {/* Rating: Star component */}
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

                    {/* Body: The comment text */}
                    {review.comment && (
                      <div>
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {review.comment}
                        </p>
                      </div>
                    )}

                    {/* Tags: Render tags as badges if they exist */}
                    {review.tags && review.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {review.tags.map((tag: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
