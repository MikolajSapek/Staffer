'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Star, Building2, MapPin, Calendar, Loader2, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface CompanyProfileDialogProps {
  companyId: string;
  children: React.ReactNode;
  lang: string;
}

interface CompanyProfile {
  id: string;
  email: string;
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected';
  average_rating: number | null;
  total_reviews: number;
  created_at: string;
  company_details: {
    company_name: string;
    logo_url: string | null;
    main_address: string | null;
    description: string | null;
  } | null;
}

export default function CompanyProfileDialog({
  companyId,
  children,
  lang,
}: CompanyProfileDialogProps) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [activeShiftsCount, setActiveShiftsCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && companyId) {
      fetchCompanyProfile();
    }
  }, [open, companyId]);

  const fetchCompanyProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Fetch company profile with company details
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          verification_status,
          average_rating,
          total_reviews,
          created_at,
          company_details (
            company_name,
            logo_url,
            main_address,
            description
          )
        `)
        .eq('id', companyId)
        .single();

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          setError('Profile is private or you do not have access.');
        } else {
          setError(profileError.message);
        }
        return;
      }

      setProfile(profileData as CompanyProfile);

      // Optionally fetch active shifts count
      const now = new Date().toISOString();
      const { count, error: shiftsError } = await supabase
        .from('shifts')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'published')
        .gt('end_time', now);

      if (!shiftsError && count !== null) {
        setActiveShiftsCount(count);
      }
    } catch (err) {
      setError('Failed to load company profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const companyName = profile?.company_details?.company_name || 'Company';
  const companyLogo = profile?.company_details?.logo_url || null;
  const companyInitials = companyName
    .split(' ')
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'CO';

  const memberSinceYear = profile?.created_at
    ? new Date(profile.created_at).getFullYear()
    : null;

  return (
    <>
      <div
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="cursor-pointer hover:opacity-80 transition-opacity"
      >
        {children}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {profile ? companyName : 'Company Profile'}
            </DialogTitle>
            {profile && (
              <DialogDescription>
                Company Profile
              </DialogDescription>
            )}
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive text-center">
              {error}
            </div>
          ) : profile ? (
            <>
              {/* Header: Large Logo + Company Name + Verification Badge */}
              <div className="flex items-start gap-4 pb-4 border-b">
                <Avatar className="h-20 w-20 flex-shrink-0 border-2 border-border">
                  <AvatarImage
                    src={companyLogo || undefined}
                    alt={companyName}
                  />
                  <AvatarFallback className="text-2xl">
                    {companyInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-2xl font-bold">
                      {companyName}
                    </h2>
                    {profile.verification_status === 'verified' && (
                      <Badge variant="default" className="gap-1 bg-green-600">
                        <CheckCircle2 className="h-3 w-3" />
                        Verified
                      </Badge>
                    )}
                    {profile.verification_status === 'pending' && (
                      <Badge variant="outline" className="gap-1 border-orange-500 text-orange-700">
                        <Clock className="h-3 w-3" />
                        Pending
                      </Badge>
                    )}
                    {profile.verification_status === 'rejected' && (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        Rejected
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0 space-y-6 py-4">
                {/* Trust Row: Star Rating + Member Since */}
                <div className="flex items-center gap-6 flex-wrap">
                  {profile.average_rating !== null && profile.total_reviews > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={cn(
                              'h-4 w-4',
                              star <= Math.round(profile.average_rating!)
                                ? 'fill-yellow-400 stroke-yellow-400'
                                : 'fill-muted stroke-muted'
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-medium">
                        {profile.average_rating.toFixed(1)} ⭐ ({profile.total_reviews} review{profile.total_reviews === 1 ? '' : 's'})
                      </span>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      No reviews yet
                    </div>
                  )}
                  {memberSinceYear && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Member since {memberSinceYear}</span>
                    </div>
                  )}
                  {activeShiftsCount !== null && activeShiftsCount > 0 && (
                    <div className="text-sm text-muted-foreground">
                      {activeShiftsCount} active job{activeShiftsCount === 1 ? '' : 's'}
                    </div>
                  )}
                </div>

                {/* About Section: Company description/bio */}
                {profile.company_details?.description && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">About</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {profile.company_details.description}
                    </p>
                  </div>
                )}

                {/* Contact/Info Section */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Contact & Information</h3>
                  <div className="space-y-2 text-sm">
                    {profile.email && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-muted-foreground w-24">Email:</span>
                        <a
                          href={`mailto:${profile.email}`}
                          className="text-primary hover:underline"
                        >
                          {profile.email}
                        </a>
                      </div>
                    )}
                    {profile.company_details?.main_address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium text-muted-foreground">Location:</span>
                          <p className="text-muted-foreground">{profile.company_details.main_address}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Close
                </Button>
                <Button asChild>
                  <Link href={`/${lang}`}>
                    View all jobs
                  </Link>
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
