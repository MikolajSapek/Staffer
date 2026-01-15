'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatTime, formatDateShort } from '@/lib/date-utils';
import { ArrowLeft, Mail, Phone, Users, Archive, Loader2, Star, Trash2, Pencil } from 'lucide-react';
import Link from 'next/link';
import { archiveShift, cancelWorkerAction } from '@/app/actions/shifts';
import RateWorkerDialog from '@/components/RateWorkerDialog';
import CancelWorkerDialog from '@/components/shifts/CancelWorkerDialog';
import EditShiftDialog from '@/components/shifts/EditShiftDialog';
import { useToast } from '@/components/ui/use-toast';

interface WorkerDetails {
  avatar_url: string | null;
  phone_number: string | null;
}


interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  average_rating: number | null;
  total_reviews: number;
  worker_details?: WorkerDetails | WorkerDetails[] | null;
}

interface Application {
  id: string;
  status: string;
  applied_at: string;
  worker_message: string | null;
  profiles: Profile | null;
}

interface Location {
  id: string;
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
  possible_overtime: boolean;
  vacancies_total: number;
  vacancies_taken: number;
  status: string;
  category: string;
  location_id: string;
  is_urgent: boolean;
  company_id: string;
  locations: Location | null;
  shift_applications?: Application[];
}

interface ShiftDetailsClientProps {
  shift: Shift;
  hiredTeam: Application[];
  reviewsMap?: Record<string, { rating: number; comment: string | null; tags: string[] | null }>;
  lang: string;
  dict: any;
  locations: Array<{ id: string; name: string; address: string }>;
  createShiftDict: any;
  shiftOptions: any;
}

export default function ShiftDetailsClient({
  shift,
  hiredTeam,
  reviewsMap = {},
  lang,
  dict,
  locations,
  createShiftDict,
  shiftOptions,
}: ShiftDetailsClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isCancelPending, startCancelTransition] = useTransition();
  const [archiveMessage, setArchiveMessage] = useState<string | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<{
    applicationId: string;
    workerName: string;
  } | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Helper to safely extract worker_details
  const getWorkerDetails = (profile: Profile | null): WorkerDetails | null => {
    if (!profile?.worker_details) return null;
    if (Array.isArray(profile.worker_details)) {
      return profile.worker_details[0] || null;
    }
    return profile.worker_details as WorkerDetails;
  };

  const handleArchive = () => {
    setArchiveError(null);
    setArchiveMessage(null);
    
    startTransition(async () => {
      const result = await archiveShift({
        shiftId: shift.id,
        lang,
      });

      if (result.error) {
        setArchiveError(result.error);
      } else {
        setArchiveMessage(result.message || 'Shift archived successfully');
        // Refresh the page to show updated status
        setTimeout(() => {
          router.refresh();
        }, 1500);
      }
    });
  };

  const isArchived = shift.status === 'completed' || shift.status === 'cancelled';
  const canRateWorkers = shift.status === 'completed' || shift.status === 'cancelled';

  const handleRateClick = (workerId: string, workerName: string) => {
    setSelectedWorker({ id: workerId, name: workerName });
    setRatingDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setRatingDialogOpen(open);
    if (!open) {
      // Reset selected worker when dialog closes
      setSelectedWorker(null);
    }
  };

  const handleReviewSubmitted = () => {
    router.refresh();
  };

  const handleCancelClick = (applicationId: string, workerName: string) => {
    setCancelTarget({ applicationId, workerName });
    setCancelDialogOpen(true);
  };

  const handleCancelClose = () => {
    setCancelDialogOpen(false);
    setCancelTarget(null);
  };

  const handleCancelConfirm = (reason: string) => {
    if (!cancelTarget) return;

    startCancelTransition(async () => {
      try {
        const result = await cancelWorkerAction(
          cancelTarget.applicationId,
          reason,
          `/${lang}/shifts/${shift.id}`
        );

        if (!result.success) {
          toast({
            title: 'Error',
            description: result.error || result.message || 'Failed to cancel worker.',
            variant: 'destructive',
          });
          return;
        }

        handleCancelClose();
        toast({
          title: 'Worker cancelled',
          description: 'The worker has been removed from the shift.',
          variant: 'default',
        });
        router.refresh();
      } catch (error) {
        toast({
          title: 'Error',
          description: 'An unexpected error occurred while cancelling the worker.',
          variant: 'destructive',
        });
      }
    });
  };

  // Helper to get status badge
  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      published: 'default',
      full: 'secondary',
      completed: 'outline',
      cancelled: 'destructive',
    };
    const labels: Record<string, string> = {
      published: dict.status?.active || 'Active',
      full: dict.status?.fullyBooked || 'Fully Booked',
      completed: dict.status?.completed || 'Completed',
      cancelled: dict.status?.cancelled || 'Cancelled',
    };
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href={`/${lang}/shifts`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {dict.companyShifts?.viewDetails || 'Back to Shifts'}
          </Link>
        </Button>
      </div>

      {/* Shift Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-3xl mb-2">{shift.title}</CardTitle>
              <CardDescription className="text-base">
                {shift.locations?.name || dict.jobBoard?.locationNotSpecified || 'Location not specified'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(shift.status)}
              {shift.status !== 'completed' && shift.status !== 'cancelled' && (
                <>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => setIsEditOpen(true)}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit Shift
                  </Button>
                  {hiredTeam.length > 0 && (
                    <Button
                      onClick={handleArchive}
                      disabled={isPending}
                      variant="outline"
                      className="gap-2"
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Archiving...
                        </>
                      ) : (
                        <>
                          <Archive className="h-4 w-4" />
                          Archive Shift
                        </>
                      )}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
          {archiveMessage && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
              {archiveMessage}
            </div>
          )}
          {archiveError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {archiveError}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">
                {dict.dashboard?.date || 'Date'}
              </div>
              <div className="text-base">{formatDateShort(shift.start_time)}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">
                {dict.dashboard?.time || 'Time'}
              </div>
              <div className="text-base">
                {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">
                {dict.dashboard?.rate || 'Rate'}
              </div>
              <div className="text-base">{shift.hourly_rate} DKK/t</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">
                {dict.dashboard?.booked || 'Booked'}
              </div>
              <div className="text-base">
                {shift.vacancies_taken || 0} / {shift.vacancies_total}
              </div>
            </div>
          </div>

          {shift.description && (
            <div className="mt-6 pt-6 border-t">
              <div className="text-sm font-medium text-muted-foreground mb-2">
                Description
              </div>
              <p className="text-sm whitespace-pre-wrap">{shift.description}</p>
            </div>
          )}

          {shift.locations?.address && (
            <div className="mt-4">
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Address
              </div>
              <p className="text-sm">{shift.locations.address}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hired Team Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>Hired Team</CardTitle>
          </div>
          <CardDescription>
            Workers approved for this shift
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hiredTeam.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                No workers hired yet
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {hiredTeam.map((application) => {
                const profile = application.profiles;
                if (!profile) return null;

                const workerDetails = getWorkerDetails(profile);
                const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown Worker';
                const initials = profile.first_name && profile.last_name
                  ? `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase()
                  : '??';
                const avatarUrl = workerDetails?.avatar_url || null;
                const phoneNumber = workerDetails?.phone_number || null;

                return (
                  <Card key={application.id} className="border">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <Avatar className="h-16 w-16 flex-shrink-0">
                          <AvatarImage src={avatarUrl || undefined} alt={fullName} />
                          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                        </Avatar>

                        {/* Worker Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-semibold text-base mb-1 truncate">
                                {fullName}
                              </div>
                              <div className="space-y-1 text-sm text-muted-foreground">
                                {profile.email && (
                                  <div className="flex items-center gap-2 truncate">
                                    <Mail className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate">{profile.email}</span>
                                  </div>
                                )}
                                {phoneNumber && (
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-3 w-3 flex-shrink-0" />
                                    <span>{phoneNumber}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleCancelClick(application.id, fullName)}
                              disabled={isCancelPending || isArchived}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Rating Button/Status */}
                          {canRateWorkers && (
                            <div className="mt-3">
                              {reviewsMap[profile.id] ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled
                                  className="gap-2"
                                >
                                  <Star className="h-4 w-4 fill-yellow-400 stroke-yellow-400" />
                                  <span>Rated ({reviewsMap[profile.id].rating}/5)</span>
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRateClick(profile.id, fullName)}
                                  className="gap-2"
                                >
                                  <Star className="h-4 w-4" />
                                  <span>Rate Worker</span>
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rating Dialog */}
      {selectedWorker && (
        <RateWorkerDialog
          open={ratingDialogOpen}
          onOpenChange={handleDialogOpenChange}
          workerId={selectedWorker.id}
          shiftId={shift.id}
          workerName={selectedWorker.name}
          existingReview={reviewsMap[selectedWorker.id] || null}
          lang={lang}
          onReviewSubmitted={handleReviewSubmitted}
        />
      )}

      {/* Cancel Worker Dialog */}
      {cancelTarget && (
        <CancelWorkerDialog
          isOpen={cancelDialogOpen}
          onClose={handleCancelClose}
          onConfirm={handleCancelConfirm}
          workerName={cancelTarget.workerName}
          shiftStartTime={shift.start_time}
          isPending={isCancelPending}
        />
      )}

      {/* Edit Shift Dialog */}
      <EditShiftDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        shift={{
          id: shift.id,
          title: shift.title,
          description: shift.description,
          category: shift.category,
          location_id: shift.location_id,
          start_time: shift.start_time,
          end_time: shift.end_time,
          hourly_rate: shift.hourly_rate,
          break_minutes: shift.break_minutes,
          is_break_paid: shift.is_break_paid,
          vacancies_total: shift.vacancies_total,
          vacancies_taken: shift.vacancies_taken,
          is_urgent: shift.is_urgent,
          possible_overtime: shift.possible_overtime,
          company_id: shift.company_id,
          locations: shift.locations,
        }}
        lang={lang}
        locations={locations}
        createShiftDict={createShiftDict}
        shiftOptions={shiftOptions}
      />
    </div>
  );
}

