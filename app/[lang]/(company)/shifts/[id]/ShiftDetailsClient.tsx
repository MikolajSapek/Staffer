'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { CorrectionBadge } from '@/components/ui/correction-badge';
import { formatTime, formatDateShort } from '@/lib/date-utils';
import { ArrowLeft, Mail, Phone, Users, Archive, Loader2, Star, Trash2, Pencil, Lock, UserCircle } from 'lucide-react';
import Link from 'next/link';
import { archiveShift, cancelWorkerAction } from '@/app/actions/shifts';
import RateWorkerDialog from '@/components/RateWorkerDialog';
import CancelWorkerDialog from '@/components/shifts/CancelWorkerDialog';
import EditShiftDialog from '@/components/shifts/EditShiftDialog';
import CandidateProfileModal from '@/components/company/CandidateProfileModal';
import { useToast } from '@/components/ui/use-toast';

interface WorkerDetails {
  avatar_url: string | null;
  phone_number: string;
  experience: string | null;
  description: string | null;
}

interface Skill {
  id: string;
  name: string;
}

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
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
  shift_id?: string;
  worker_id?: string;
  profiles: Profile | null;
  shifts?: {
    id: string;
    title: string;
  } | null;
  languages?: Skill[];
  licenses?: Skill[];
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
  must_bring?: string | null;
  locations: Location | null;
  managers?: {
    first_name: string;
    last_name: string;
    phone_number: string | null;
    email: string;
  } | Array<{
    first_name: string;
    last_name: string;
    phone_number: string | null;
    email: string;
  }> | null;
  shift_applications?: Application[];
  requirements?: {
    languages: Array<{ id: string; name: string }>;
    licenses: Array<{ id: string; name: string }>;
  };
}

interface ShiftDetailsClientProps {
  shift: Shift;
  hiredTeam: Application[];
  reviewsMap?: Record<string, { rating: number; comment: string | null; tags: string[] | null }>;
  disputesMap?: Record<string, { 
    was_disputed: boolean; 
    metadata: {
      hours_original?: number;
      hours_final?: number;
      note?: string;
      resolution_type?: string;
    } | null;
  }>;
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
  disputesMap = {},
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
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);

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

  const handleWorkerProfileClick = (application: Application) => {
    console.log('Opening worker profile:', application);
    
    // Extract worker_details properly (could be array or object)
    const profile = application.profiles;
    const workerDetails = profile ? getWorkerDetails(profile) : null;
    
    // Enrich application with required fields for CandidateProfileModal
    const enrichedApplication: Application = {
      ...application,
      shift_id: shift.id,
      worker_id: profile?.id || '',
      profiles: profile ? {
        ...profile,
        worker_details: {
          avatar_url: workerDetails?.avatar_url || null,
          phone_number: workerDetails?.phone_number || '',
          description: workerDetails?.description || null,
          experience: workerDetails?.experience || null,
        }
      } : null,
      shifts: {
        id: shift.id,
        title: shift.title,
      },
      languages: application.languages || [],
      licenses: application.licenses || [],
    };
    
    console.log('Enriched application with worker_details:', enrichedApplication);
    console.log('Worker details description:', enrichedApplication.profiles?.worker_details);
    setSelectedApplication(enrichedApplication);
    setProfileModalOpen(true);
    console.log('Modal should open now. profileModalOpen will be:', true);
  };

  const handleProfileModalClose = (open: boolean) => {
    setProfileModalOpen(open);
    if (!open) {
      setSelectedApplication(null);
    }
  };

  const handleProfileModalSuccess = () => {
    router.refresh();
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
          <Link href={`/${lang}/dashboard`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
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
          {/* Top Stats Grid - Date, Time, Rate, Booked */}
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

          {/* Two Column Layout: Content + Manager Sidebar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
            {/* Left Column - Main Content */}
            <div className="md:col-span-2 space-y-6">
              {shift.description && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    Description
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{shift.description}</p>
                </div>
              )}

              {shift.locations?.address && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Address
                  </div>
                  <p className="text-sm">{shift.locations.address}</p>
                </div>
              )}

              {/* Must Bring Section */}
              {shift.must_bring && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Must Bring
                  </div>
                  <p className="text-sm">{shift.must_bring}</p>
                </div>
              )}

              {/* Requirements Section */}
              {shift.requirements && shift.requirements.languages.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-3">
                    Requirements
                  </div>
                  <div className="space-y-3">
                    {/* Languages */}
                    {shift.requirements.languages.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Languages:</p>
                        <div className="flex flex-wrap gap-2">
                          {shift.requirements.languages.map((lang) => (
                            <Badge key={lang.id} variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                              {lang.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Licenses - HIDDEN FOR NOW (business decision) */}
                    {false && shift.requirements.licenses.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Licenses:</p>
                        <div className="flex flex-wrap gap-2">
                          {shift.requirements.licenses.map((license) => (
                            <Badge key={license.id} variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">
                              {license.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Manager Card */}
            <div className="md:col-span-1">
              <div className="border rounded-lg p-6 bg-card">
                <div className="text-sm font-medium text-muted-foreground mb-4">
                  Shift Manager
                </div>
                {(() => {
                  // Handle both object and array cases from Supabase
                  const manager = shift.managers 
                    ? (Array.isArray(shift.managers) ? shift.managers[0] : shift.managers)
                    : null;
                  
                  if (manager) {
                    const initials = manager.first_name && manager.last_name
                      ? `${manager.first_name.charAt(0)}${manager.last_name.charAt(0)}`.toUpperCase()
                      : manager.first_name?.charAt(0).toUpperCase() || 'M';
                    
                    return (
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="text-base">{initials}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-base font-semibold">
                              {manager.first_name} {manager.last_name}
                            </span>
                          </div>
                        </div>
                        
                        <div className="space-y-2 pt-2 border-t">
                          {manager.phone_number && (
                            <a
                              href={`tel:${manager.phone_number}`}
                              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                            >
                              <Phone className="h-4 w-4" />
                              <span>{manager.phone_number}</span>
                            </a>
                          )}
                          {manager.email && (
                            <a
                              href={`mailto:${manager.email}`}
                              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                            >
                              <Mail className="h-4 w-4" />
                              <span className="break-all">{manager.email}</span>
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="text-center py-8">
                      <UserCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                      <p className="text-sm text-muted-foreground">
                        No manager assigned
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
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
                  <Card 
                    key={application.id} 
                    className="border cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleWorkerProfileClick(application)}
                  >
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
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="font-semibold text-base truncate">
                                  {fullName}
                                </div>
                                {disputesMap[profile.id]?.was_disputed && (
                                  <CorrectionBadge
                                    metadata={disputesMap[profile.id].metadata}
                                    was_disputed={disputesMap[profile.id].was_disputed}
                                  />
                                )}
                              </div>
                              <div className="space-y-1 text-sm text-muted-foreground">
                                {/* Privacy Gate: Show contact info only if accepted/completed */}
                                {application.status === 'accepted' || application.status === 'completed' ? (
                                  <>
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
                                  </>
                                ) : (
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-muted-foreground/60">
                                      <Lock className="h-3 w-3 flex-shrink-0" />
                                      <span className="text-xs italic">Hire to reveal contact</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground/40">
                                      <Phone className="h-3 w-3 flex-shrink-0" />
                                      <span className="blur-sm select-none">+45 •• •• •• ••</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelClick(application.id, fullName);
                              }}
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRateClick(profile.id, fullName);
                                  }}
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
          must_bring: shift.must_bring || null,
          required_language_ids: shift.requirements?.languages?.map((l: any) => l.id) || [],
          required_licence_ids: shift.requirements?.licenses?.map((l: any) => l.id) || [],
          company_id: shift.company_id,
          locations: shift.locations,
        }}
        lang={lang}
        locations={locations}
        createShiftDict={createShiftDict}
        shiftOptions={shiftOptions}
      />

      {/* Worker Profile Modal */}
      {selectedApplication && (
        <CandidateProfileModal
          open={profileModalOpen}
          onOpenChange={handleProfileModalClose}
          application={selectedApplication}
          dict={{
            title: 'Worker Profile',
            about: 'About',
            contact: 'Contact',
            applicationMessage: 'Application Message',
            appliedFor: 'Applied For',
            appliedAt: 'Applied At',
            status: 'Status',
            accept: 'Accept',
            reject: 'Reject',
            accepting: 'Accepting...',
            rejecting: 'Rejecting...',
            acceptSuccess: 'Application accepted',
            rejectSuccess: 'Application rejected',
            error: 'An error occurred',
            close: 'Close',
            languages: 'Languages',
            licenses: 'Licenses',
            noQualifications: 'No specific qualifications listed'
          }}
          lang={lang}
          onSuccess={handleProfileModalSuccess}
        />
      )}
    </div>
  );
}

