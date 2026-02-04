'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Star, Users, X, Clock, Wallet, MapPin, Calendar, Lock, Phone, Mail, Heart } from 'lucide-react';
import ApplicantProfileModal from '@/components/company/ApplicantProfileModal';
import WorkerReviewsDialog from '@/components/WorkerReviewsDialog';
import { Tooltip } from '@/components/ui/tooltip';
import { formatTime } from '@/lib/date-utils';
import { format } from 'date-fns';
import { fillVacancies, rejectAllPending } from '@/app/actions/applications';
import { useToast } from '@/components/ui/use-toast';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

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
  is_favorite?: boolean;
  is_blacklist?: boolean;
}

interface ApplicantsClientProps {
  applications: Application[];
  dict: {
    applicantsPage: {
      status: {
        accepted: string;
        pending: string;
        rejected: string;
        waitlist: string;
      };
      table: {
        applicant: string;
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

export default function ApplicantsClient({
  applications,
  dict,
  lang,
}: ApplicantsClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingShiftId, setLoadingShiftId] = useState<string | null>(null);
  const [confirmRejectAllOpen, setConfirmRejectAllOpen] = useState(false);
  const [pendingRejectShiftId, setPendingRejectShiftId] = useState<string | null>(null);
  const [pendingRejectCount, setPendingRejectCount] = useState<number>(0);

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
      accepted: dict.applicantsPage.status.accepted,
      pending: dict.applicantsPage.status.pending,
      rejected: dict.applicantsPage.status.rejected,
      waitlist: dict.applicantsPage.status.waitlist,
    };
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {statusLabels[status] || status}
      </Badge>
    );
  }, [dict.applicantsPage.status]);

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
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      } else {
        router.refresh();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while filling vacancies',
        variant: 'destructive',
      });
    } finally {
      setLoadingShiftId(null);
    }
  }, [loadingShiftId, lang, router]);

  const handleRejectAllPendingClick = useCallback((shiftId: string, pendingCount: number) => {
    if (pendingCount === 0 || loadingShiftId) return;
    setPendingRejectShiftId(shiftId);
    setPendingRejectCount(pendingCount);
    setConfirmRejectAllOpen(true);
  }, [loadingShiftId]);

  const handleRejectAllPending = useCallback(async () => {
    if (!pendingRejectShiftId || pendingRejectCount === 0) return;

    setConfirmRejectAllOpen(false);
    setLoadingShiftId(pendingRejectShiftId);
    try {
      const result = await rejectAllPending(pendingRejectShiftId, lang);
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      } else {
        router.refresh();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while rejecting applications',
        variant: 'destructive',
      });
    } finally {
      setLoadingShiftId(null);
      setPendingRejectShiftId(null);
      setPendingRejectCount(0);
    }
  }, [pendingRejectShiftId, pendingRejectCount, lang, router, toast]);

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

          // Pre-filtering: Filter applications based on shift end time
          const shiftEndTime = group.shift?.end_time;
          const isPast = shiftEndTime ? new Date(shiftEndTime) < new Date() : false;

          const visibleApplications = group.applications.filter(app => {
            // Jeśli zmiana TRWA lub jest w PRZYSZŁOŚCI -> Pokaż wszystkich
            if (!isPast) return true;
            
            // Jeśli zmiana MINĘŁA -> Pokaż tylko zaakceptowanych
            const status = app.status?.toLowerCase().trim() || '';
            return status === 'accepted' || status === 'completed' || status === 'approved';
          });

          // Skip rendering empty cards for past shifts with no accepted workers
          if (visibleApplications.length === 0) {
            return null;
          }

          return (
          <Card key={group.shiftId} className="overflow-hidden">
            <CardHeader className="relative">
              <div className="absolute top-6 right-6 flex items-center gap-2">
                {group.canFillVacancies && group.shift && (
                  <Button
                    size="sm"
                    onClick={() => handleFillVacancies(group.shift!, visibleApplications)}
                    disabled={isLoading}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Users className="h-4 w-4" />
                    Accept All
                  </Button>
                )}
                {group.pendingCount > 0 && group.shift && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRejectAllPendingClick(group.shift!.id, group.pendingCount)}
                    disabled={isLoading}
                    className="flex items-center gap-2 border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                    Reject All
                  </Button>
                )}
              </div>

              <div className="space-y-4 pr-48">
                <div>
                  <CardTitle className="text-2xl font-bold text-slate-800">
                    {group.shiftTitle}
                  </CardTitle>
                  {group.shift && (
                    <div className="mt-2">
                      <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full w-fit inline-flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(group.shift.start_time), 'dd MMM')}
                      </span>
                    </div>
                  )}
                </div>
                
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
                      {group.pendingCount} {dict.applicantsPage.status.pending.toLowerCase()}
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
                {visibleApplications.map((app) => {
                  const profile = app.profiles;
                  const workerDetails = getWorkerDetails(profile);

                  if (!profile) return null;

                  // --- SAFE LOGIC: Clean up past shifts ---
                  const shiftEndTime = app.shifts?.end_time;
                  if (shiftEndTime) {
                    const isShiftEnded = new Date(shiftEndTime) < new Date();
                    
                    // Normalizuj status (małe litery, usuń spacje), aby uniknąć błędów
                    const status = app.status?.toLowerCase().trim() || '';

                    // 1. Ukryj ODRZUCONYCH (Rejected) na starych zmianach
                    if (isShiftEnded && status === 'rejected') {
                      return null;
                    }
                    
                    // 2. Ukryj OCZEKUJĄCYCH (Pending) na starych zmianach (bo jest już za późno na akceptację)
                    // UWAGA: Nie ukrywaj 'accepted', 'completed', 'approved' itp.
                    if (isShiftEnded && status === 'pending') {
                      return null;
                    }
                  }
                  // ----------------------------------------

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
                              {app.is_favorite && (
                                <Tooltip content="You marked this worker as favorite">
                                  <span className="inline-flex">
                                    <Heart className="h-4 w-4 fill-red-500 text-red-500 shrink-0" />
                                  </span>
                                </Tooltip>
                              )}
                              <WorkerReviewsDialog
                                workerId={profile.id}
                                workerName={fullName}
                              >
                                {renderRating(profile.average_rating, profile.total_reviews, true)}
                              </WorkerReviewsDialog>
                            </div>
                            {/* Privacy Gate: Show contact info only if accepted/completed */}
                            {app.status === 'accepted' || app.status === 'completed' ? (
                              <>
                                <div className="text-sm text-slate-600 flex items-center gap-1.5">
                                  <Mail className="h-3 w-3 text-slate-400" />
                                  {profile.email || ''}
                                </div>
                                {phoneNumber && (
                                  <div className="text-sm text-slate-500 flex items-center gap-1.5">
                                    <Phone className="h-3 w-3 text-slate-400" />
                                    {phoneNumber}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="text-sm text-slate-500/60 italic flex items-center gap-1.5">
                                <Lock className="h-3 w-3" />
                                Accept to reveal contact
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
                            {dict.applicantsPage.actions.viewProfile}
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
        <ApplicantProfileModal
          open={modalOpen}
          onOpenChange={handleModalClose}
          application={selectedApplication}
          dict={dict.applicantsPage.modal}
          lang={lang}
          onSuccess={handleModalSuccess}
        />
      )}

      <ConfirmationDialog
        open={confirmRejectAllOpen}
        onOpenChange={setConfirmRejectAllOpen}
        onConfirm={handleRejectAllPending}
        title="Confirm Mass Rejection"
        description="This will reject all remaining applicants. This action cannot be undone."
        confirmText="Reject All"
        cancelText="Cancel"
        variant="destructive"
        loading={loadingShiftId === pendingRejectShiftId}
      />
    </>
  );
}

