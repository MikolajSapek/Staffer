'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Star, Users, X, Clock, Wallet, MapPin } from 'lucide-react';
import CandidateProfileModal from '@/components/company/CandidateProfileModal';
import WorkerReviewsDialog from '@/components/WorkerReviewsDialog';
import { formatTime } from '@/lib/date-utils';
import { fillVacancies, rejectAllPending } from '@/app/actions/applications';

interface WorkerDetails {
  avatar_url: string | null;
  phone_number: string;
  experience: string | null;
  description: string | null;
}

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  average_rating: number | null;
  total_reviews: number;
  worker_details: WorkerDetails | null;
}

interface Location {
  name: string;
  address: string;
}

interface Shift {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  hourly_rate: number;
  break_minutes: number;
  is_break_paid: boolean;
  vacancies_total: number;
  vacancies_taken: number;
  locations: Location | null;
}

interface Application {
  id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'waitlist';
  applied_at: string;
  worker_message: string | null;
  shift_id: string;
  worker_id: string;
  profiles: Profile | null;
  shifts: Shift | null;
}

interface CandidatesClientProps {
  applications: Application[];
  dict: {
    candidatesPage: {
      status: {
        accepted: string;
        pending: string;
        rejected: string;
        waitlist: string;
      };
      table: {
        candidate: string;
        rating: string;
        status: string;
        actions: string;
      };
      actions: {
        viewProfile: string;
      };
      modal: {
        title: string;
        about: string;
        aboutPlaceholder?: string;
        contact: string;
        applicationMessage: string;
        appliedFor: string;
        appliedAt: string;
        status: string;
        accept: string;
        reject: string;
        accepting: string;
        rejecting: string;
        acceptSuccess: string;
        rejectSuccess: string;
        error: string;
        close?: string;
      };
    };
  };
  lang: string;
}

export default function CandidatesClient({
  applications,
  dict,
  lang,
}: CandidatesClientProps) {
  const router = useRouter();
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingShiftId, setLoadingShiftId] = useState<string | null>(null);

  const getWorkerDetails = useCallback((profile: Profile | null): WorkerDetails | null => {
    if (!profile?.worker_details) return null;
    return profile.worker_details as WorkerDetails;
  }, []);

  const getStatusBadge = useCallback((status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      accepted: 'default',
      pending: 'secondary',
      rejected: 'destructive',
      waitlist: 'outline',
    };
    const statusLabels: Record<string, string> = {
      accepted: dict.candidatesPage.status.accepted,
      pending: dict.candidatesPage.status.pending,
      rejected: dict.candidatesPage.status.rejected,
      waitlist: dict.candidatesPage.status.waitlist,
    };
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {statusLabels[status] || status}
      </Badge>
    );
  }, [dict.candidatesPage.status]);

  const getInitials = useCallback((firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }, []);

  const renderRating = useCallback((averageRating: number | null, totalReviews: number, compact: boolean = false) => {
    if (averageRating === null || totalReviews === 0) {
      return (
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className="h-3.5 w-3.5 fill-muted stroke-muted"
            />
          ))}
          {!compact && (
            <span className="text-xs text-muted-foreground ml-1">No reviews</span>
          )}
        </div>
      );
    }

    const rating = Math.round(averageRating);
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3.5 w-3.5 ${
              star <= rating
                ? 'fill-yellow-400 stroke-yellow-400'
                : 'fill-muted stroke-muted'
            }`}
          />
        ))}
        {!compact && (
          <span className="text-xs text-muted-foreground ml-1">
            {averageRating.toFixed(1)} ({totalReviews})
          </span>
        )}
      </div>
    );
  }, []);

  const handleRowClick = useCallback((application: Application) => {
    setSelectedApplication(application);
    setModalOpen(true);
  }, []);

  const handleModalSuccess = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleModalClose = useCallback((open: boolean) => {
    setModalOpen(open);
    if (!open) {
      setSelectedApplication(null);
    }
  }, []);

  const handleFillVacancies = useCallback(async (shift: Shift, pendingApplications: Application[]) => {
    if (!shift || loadingShiftId) return;

    const slotsLeft = shift.vacancies_total - shift.vacancies_taken;
    if (slotsLeft <= 0 || pendingApplications.length === 0) {
      return;
    }

    const sortedPending = [...pendingApplications]
      .filter(app => app.status === 'pending')
      .sort((a, b) => new Date(a.applied_at).getTime() - new Date(b.applied_at).getTime())
      .slice(0, slotsLeft);

    const applicationIds = sortedPending.map(app => app.id);

    setLoadingShiftId(shift.id);
    try {
      const result = await fillVacancies(shift.id, applicationIds, lang);
      if (result.error) {
        alert(result.error);
      } else {
        router.refresh();
      }
    } catch (error) {
      alert('An error occurred while filling vacancies');
    } finally {
      setLoadingShiftId(null);
    }
  }, [loadingShiftId, lang, router]);

  const handleRejectAllPending = useCallback(async (shiftId: string, pendingCount: number) => {
    if (pendingCount === 0 || loadingShiftId) return;

    const confirmed = window.confirm(
      'Czy na pewno chcesz odrzucić wszystkich pozostałych kandydatów?'
    );

    if (!confirmed) return;

    setLoadingShiftId(shiftId);
    try {
      const result = await rejectAllPending(shiftId, lang);
      if (result.error) {
        alert(result.error);
      } else {
        router.refresh();
      }
    } catch (error) {
      alert('An error occurred while rejecting applications');
    } finally {
      setLoadingShiftId(null);
    }
  }, [loadingShiftId, lang, router]);

  const groupedByShift = useMemo(() => {
    return applications.reduce((acc, app) => {
    const shiftId = app.shift_id;
    const shift = app.shifts;
    
    if (!shift) return acc;
    
    if (!acc[shiftId]) {
      acc[shiftId] = {
        shiftTitle: shift.title,
        shiftId: shiftId,
        applications: [],
      };
    }
    
    acc[shiftId].applications.push(app);
    return acc;
  }, {} as Record<string, { shiftTitle: string; shiftId: string; applications: Application[] }>);
  }, [applications]);

  const shiftGroups = useMemo(() => {
    return Object.values(groupedByShift);
  }, [groupedByShift]);

  const shiftGroupsWithStats = useMemo(() => {
    return shiftGroups.map((group) => {
      const firstApp = group.applications[0];
      const shift = firstApp?.shifts;
      
      const pendingCount = group.applications.filter(a => a.status === 'pending').length;
      const isFull = shift ? shift.vacancies_taken >= shift.vacancies_total : false;
      const slotsLeft = shift ? shift.vacancies_total - shift.vacancies_taken : 0;
      const pendingApps = group.applications.filter(a => a.status === 'pending');
      const canFillVacancies = slotsLeft > 0 && pendingApps.length > 0;
      const formattedStartTime = shift ? formatTime(shift.start_time) : '';
      const formattedEndTime = shift ? formatTime(shift.end_time) : '';
      
      return {
        ...group,
        shift,
        pendingCount,
        isFull,
        slotsLeft,
        pendingApps,
        canFillVacancies,
        formattedStartTime,
        formattedEndTime,
      };
    });
  }, [shiftGroups]);

  return (
    <>
      <div className="space-y-6">
        {shiftGroupsWithStats.map((group) => {
          const isLoading = loadingShiftId === group.shiftId;

          return (
          <Card key={group.shiftId} className="overflow-hidden">
            <CardHeader className="relative">
              <div className="absolute top-6 right-6 flex items-center gap-2">
                {group.canFillVacancies && group.shift && (
                  <Button
                    size="sm"
                    onClick={() => handleFillVacancies(group.shift!, group.applications)}
                    disabled={isLoading}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Users className="h-4 w-4" />
                    Fill Remaining
                  </Button>
                )}
                {group.pendingCount > 0 && group.shift && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRejectAllPending(group.shift!.id, group.pendingCount)}
                    disabled={isLoading}
                    className="flex items-center gap-2 border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                    Reject Others
                  </Button>
                )}
              </div>

              <div className="space-y-4 pr-48">
                <CardTitle className="text-2xl font-bold text-slate-800">
                  {group.shiftTitle}
                </CardTitle>
                
                {group.shift && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge variant="outline" className="text-xs font-normal px-3 py-1.5 bg-slate-50 border-slate-200">
                      <Clock className="h-3 w-3 mr-1.5 text-slate-600" />
                      {group.formattedStartTime} - {group.formattedEndTime}
                    </Badge>
                    <Badge variant="outline" className="text-xs font-normal px-3 py-1.5 bg-slate-50 border-slate-200">
                      <Wallet className="h-3 w-3 mr-1.5 text-slate-600" />
                      {group.shift.hourly_rate} DKK/h
                    </Badge>
                    {group.shift.locations && (
                      <Badge variant="outline" className="text-xs font-normal px-3 py-1.5 bg-slate-50 border-slate-200">
                        <MapPin className="h-3 w-3 mr-1.5 text-slate-600" />
                        {group.shift.locations.name} ({group.shift.locations.address})
                      </Badge>
                    )}
                  </div>
                )}
                
                {group.shift?.description && (
                  <p className="text-sm text-slate-600 italic mt-2">
                    {group.shift.description}
                  </p>
                )}
                
                <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-slate-200">
                  {group.shift && (
                    <span className="text-sm text-muted-foreground">
                      Miejsca: {group.shift.vacancies_taken}/{group.shift.vacancies_total}
                    </span>
                  )}
                  {group.pendingCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {group.pendingCount} {dict.candidatesPage.status.pending.toLowerCase()}
                    </Badge>
                  )}
                  {group.isFull && (
                    <Badge variant="destructive" className="font-semibold text-xs">
                      FULL
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {group.applications.map((app) => {
                  const profile = app.profiles;
                  const workerDetails = getWorkerDetails(profile);

                  if (!profile) return null;

                  const firstName = profile.first_name || '';
                  const lastName = profile.last_name || '';
                  const fullName = `${firstName} ${lastName}`.trim() || profile.email || 'Unknown';
                  const phoneNumber = workerDetails?.phone_number || '';
                  const initials = firstName && lastName 
                    ? getInitials(firstName, lastName)
                    : profile.email?.charAt(0).toUpperCase() || '??';
                  const avatarUrl = workerDetails?.avatar_url || null;

                  return (
                    <div
                      key={app.id}
                      className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer"
                      onClick={() => handleRowClick(app)}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          <Avatar className="h-14 w-14 border-2 border-slate-100">
                            <AvatarImage src={avatarUrl || undefined} alt={fullName} />
                            <AvatarFallback className="bg-slate-100 text-slate-700 text-lg">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-slate-900 text-base">
                                {fullName}
                              </span>
                              <WorkerReviewsDialog
                                workerId={profile.id}
                                workerName={fullName}
                              >
                                {renderRating(profile.average_rating, profile.total_reviews, true)}
                              </WorkerReviewsDialog>
                            </div>
                            <div className="text-sm text-slate-600">
                              {profile.email || ''}
                            </div>
                            {phoneNumber && (
                              <div className="text-sm text-slate-500">
                                {phoneNumber}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {getStatusBadge(app.status)}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowClick(app);
                            }}
                            className="text-xs"
                          >
                            {dict.candidatesPage.actions.viewProfile}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          );
        })}
      </div>

      {selectedApplication && (
        <CandidateProfileModal
          open={modalOpen}
          onOpenChange={handleModalClose}
          application={selectedApplication}
          dict={dict.candidatesPage.modal}
          lang={lang}
          onSuccess={handleModalSuccess}
        />
      )}
    </>
  );
}

