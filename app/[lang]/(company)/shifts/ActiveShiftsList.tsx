'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatTime, formatDateShort } from '@/lib/date-utils';
import { Calendar, Users, Phone, MapPin, ChevronDown, Trash2, Pencil, Eye } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import CancelWorkerDialog from '@/components/shifts/CancelWorkerDialog';
import EditShiftDialog from '@/components/shifts/EditShiftDialog';
import CandidateProfileModal from '@/components/company/CandidateProfileModal';
import { cancelWorkerAction } from '@/app/actions/shifts';
import { useToast } from '@/components/ui/use-toast';

interface WorkerDetails {
  avatar_url: string | null;
  phone_number: string | null;
  experience: string | null;
  description: string | null;
}

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email?: string;
  avatar_url: string | null;
  phone_number: string | null;
  average_rating: number | null;
  total_reviews: number;
  experience?: string | null;
  description?: string | null;
  worker_details?: WorkerDetails | null;
}

interface Application {
  id: string;
  status: string;
  profiles: Profile | null;
}

interface ModalApplication {
  id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'waitlist' | 'hired';
  applied_at: string;
  worker_message: string | null;
  shift_id: string;
  worker_id: string;
  profiles: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    average_rating: number | null;
    total_reviews: number;
    worker_details: WorkerDetails | null;
  } | null;
  shifts: {
    id: string;
    title: string;
  } | null;
  languages?: Array<{ id: string; name: string }>;
  licenses?: Array<{ id: string; name: string }>;
}

interface Location {
  name: string;
  address: string;
}

interface Shift {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  hourly_rate: number;
  vacancies_total: number;
  vacancies_taken: number;
  status: string;
  locations: Location | null;
  // Fields needed for editing (present on the shift rows fetched in page.tsx)
  description: string | null;
  category: string;
  location_id: string;
  break_minutes: number;
  is_break_paid: boolean;
  is_urgent: boolean;
  possible_overtime: boolean;
  company_id: string;
  applications?: Application[];
}

interface ActiveShiftsListProps {
  shifts: Shift[];
  dict: {
    title: string;
    description: string;
    activeShifts: string;
    noActiveShifts: string;
    date: string;
    time: string;
    rate: string;
    booked: string;
    location: string;
    locationNotSpecified: string;
    createNewShift: string;
  };
  statusDict: {
    active: string;
    fullyBooked: string;
    completed: string;
    cancelled: string;
  };
  lang: string;
  locations: Array<{ id: string; name: string; address: string }>;
  createShiftDict: any;
  shiftOptions: any;
  isArchive?: boolean;
}

export default function ActiveShiftsList({
  shifts,
  dict,
  statusDict,
  lang,
  locations,
  createShiftDict,
  shiftOptions,
  isArchive = false,
}: ActiveShiftsListProps) {
  const [expandedShift, setExpandedShift] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [selectedWorkerName, setSelectedWorkerName] = useState<string | null>(null);
  const [selectedShiftStart, setSelectedShiftStart] = useState<string | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [isCancelPending, setIsCancelPending] = useState(false);
  const [shiftToEdit, setShiftToEdit] = useState<Shift | null>(null);
  
  // Worker profile modal state
  const [selectedWorkerApplication, setSelectedWorkerApplication] = useState<ModalApplication | null>(null);
  const [workerModalOpen, setWorkerModalOpen] = useState(false);

  // Helper to get status badge
  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      published: 'default',
      full: 'secondary',
      completed: 'outline',
      cancelled: 'destructive',
    };
    const labels: Record<string, string> = {
      published: statusDict.active,
      full: statusDict.fullyBooked,
      completed: statusDict.completed,
      cancelled: statusDict.cancelled,
    };
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {labels[status] || status}
      </Badge>
    );
  };

  // Filter to only accepted/hired applications (case-insensitive)
  const getHiredTeam = (shift: Shift): Application[] => {
    return (shift.applications || []).filter((app) => 
      ['accepted', 'hired', 'Accepted', 'Hired'].includes(app.status)
    );
  };

  const toggleShift = (shiftId: string) => {
    setExpandedShift(expandedShift === shiftId ? null : shiftId);
  };

  const openCancelDialog = (
    applicationId: string,
    workerId: string,
    workerName: string,
    shiftStartTime: string
  ) => {
    setSelectedApplicationId(applicationId);
    setSelectedWorkerId(workerId);
    setSelectedWorkerName(workerName);
    setSelectedShiftStart(shiftStartTime);
    setCancelDialogOpen(true);
  };

  const closeCancelDialog = () => {
    if (isCancelPending) return;
    setCancelDialogOpen(false);
    setSelectedApplicationId(null);
    setSelectedWorkerId(null);
    setSelectedWorkerName(null);
    setSelectedShiftStart(null);
  };

  const handleCancelConfirm = async (reason: string) => {
    if (!selectedApplicationId || !selectedShiftStart) return;

    try {
      setIsCancelPending(true);

      const result = await cancelWorkerAction(
        selectedApplicationId,
        reason,
        `/${lang}/shifts`
      );

      if (!result.success) {
        toast({
          title: 'Error',
          description: result.message || result.error || 'Failed to cancel worker.',
          variant: 'destructive',
        });
        return;
      }

      closeCancelDialog();
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
    } finally {
      setIsCancelPending(false);
    }
  };

  const handleWorkerClick = (application: Application, shift: Shift, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const profile = application.profiles;
    if (!profile) return;

    // Create ModalApplication object for CandidateProfileModal
    const modalApplication: ModalApplication = {
      id: application.id,
      status: application.status.toLowerCase() as any || 'hired',
      applied_at: shift.start_time,
      worker_message: null,
      shift_id: shift.id,
      worker_id: profile.id,
      profiles: {
        id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email || '',
        average_rating: profile.average_rating,
        total_reviews: profile.total_reviews,
        worker_details: {
          avatar_url: profile.avatar_url,
          phone_number: profile.phone_number || '',
          experience: profile.experience || null,
          description: profile.description || null,
        }
      },
      shifts: {
        id: shift.id,
        title: shift.title,
      },
      languages: [],
      licenses: [],
    };
    
    setSelectedWorkerApplication(modalApplication);
    setWorkerModalOpen(true);
  };

  const handleWorkerModalClose = (open: boolean) => {
    setWorkerModalOpen(open);
    if (!open) {
      setSelectedWorkerApplication(null);
    }
  };

  const handleWorkerModalSuccess = () => {
    router.refresh();
  };

  if (shifts.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{dict.title}</h1>
          <p className="text-muted-foreground">{dict.description}</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">{dict.noActiveShifts}</p>
            {!isArchive && (
              <Button asChild>
                <Link href={`/${lang}/create-shift`}>{dict.createNewShift}</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{dict.title}</h1>
        <p className="text-muted-foreground">{dict.description}</p>
      </div>

      <div className="w-full space-y-2">
        {shifts.map((shift) => {
          const hiredTeam = getHiredTeam(shift);
          const capacityText = `${hiredTeam.length}/${shift.vacancies_total} Hired`;
          const isExpanded = expandedShift === shift.id;
          const isEditable = shift.status !== 'completed' && shift.status !== 'cancelled';

          const handleCardClick = () => {
            toggleShift(shift.id);
          };

          const handleCardKeyDown = (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleShift(shift.id);
            }
          };

          return (
            <div key={shift.id} className="border rounded-lg bg-card">
              <div
                role="button"
                tabIndex={0}
                onClick={handleCardClick}
                onKeyDown={handleCardKeyDown}
                className="w-full px-4 py-4 hover:bg-muted/50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <div className="flex flex-1 items-center justify-between">
                  <div className="flex flex-1 items-center gap-4 min-w-0">
                    {/* Shift Title */}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="font-semibold text-lg truncate">{shift.title}</div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDateShort(shift.start_time)}
                        </span>
                        <span>
                          {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                        </span>
                        {shift.locations?.name && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {shift.locations.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Hired Team Avatars and Capacity */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {/* Hired Team Avatars */}
                      {hiredTeam.length > 0 && (
                        <div className="flex items-center gap-1 -space-x-2">
                          {hiredTeam.slice(0, 4).map((application) => {
                            const profile = application.profiles;
                            if (!profile) return null;
                            
                            const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown Worker';
                            const initials = profile.first_name && profile.last_name
                              ? `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase()
                              : '??';
                            let avatarUrl = profile.avatar_url || null;
                            
                            // Construct full Supabase Storage URL if avatar_url is just a filename
                            if (avatarUrl && !avatarUrl.startsWith('http://') && !avatarUrl.startsWith('https://')) {
                              const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                              if (supabaseUrl) {
                                if (avatarUrl.includes('/')) {
                                  avatarUrl = `${supabaseUrl}/storage/v1/object/public/${avatarUrl}`;
                                } else {
                                  avatarUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${avatarUrl}`;
                                }
                              }
                            }

                            return (
                              <Avatar key={application.id} className="h-8 w-8 border-2 border-background">
                                <AvatarImage src={avatarUrl || undefined} alt={fullName} />
                                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                              </Avatar>
                            );
                          })}
                          {hiredTeam.length > 4 && (
                            <div className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium">
                              +{hiredTeam.length - 4}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="text-sm font-medium text-muted-foreground">
                        {capacityText}
                      </div>
                      {getStatusBadge(shift.status)}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/${lang}/shifts/${shift.id}`);
                        }}
                      >
                        <Eye className="h-3 w-3" />
                        <span className="hidden sm:inline">Details</span>
                      </Button>
                      {isEditable && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShiftToEdit(shift);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                          <span className="hidden sm:inline">Edit</span>
                        </Button>
                      )}
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 shrink-0 transition-transform duration-200',
                          isExpanded && 'rotate-180'
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div
                className={cn(
                  'overflow-hidden transition-all duration-200',
                  isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                )}
              >
                <div className="px-4 pt-2 pb-4">
                  {/* Shift Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
                    <div>
                      <div className="font-medium text-muted-foreground mb-1">{dict.rate}</div>
                      <div>{shift.hourly_rate} DKK/t</div>
                    </div>
                    {shift.locations?.address && (
                      <div className="col-span-2">
                        <div className="font-medium text-muted-foreground mb-1">Address</div>
                        <div>{shift.locations.address}</div>
                      </div>
                    )}
                  </div>

                  {/* Hired Team Section */}
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold">Hired Team</h3>
                    </div>
                    {hiredTeam.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No workers assigned yet</p>
                      </div>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {hiredTeam.map((application) => {
                          const profile = application.profiles;
                          if (!profile) return null;

                          const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown Worker';
                          const initials = profile.first_name && profile.last_name
                            ? `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase()
                            : '??';
                          let avatarUrl = profile.avatar_url || null;
                          
                          // Construct full Supabase Storage URL if avatar_url is just a filename
                          if (avatarUrl && !avatarUrl.startsWith('http://') && !avatarUrl.startsWith('https://')) {
                            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                            if (supabaseUrl) {
                              if (avatarUrl.includes('/')) {
                                avatarUrl = `${supabaseUrl}/storage/v1/object/public/${avatarUrl}`;
                              } else {
                                avatarUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${avatarUrl}`;
                              }
                            }
                          }
                          
                          const phoneNumber = profile.phone_number || null;

                          return (
                            <div
                              key={application.id}
                              className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                            >
                              {/* Avatar */}
                              <button
                                type="button"
                                onClick={(e) => handleWorkerClick(application, shift, e)}
                                className="flex-shrink-0"
                              >
                                <Avatar className="h-12 w-12 cursor-pointer hover:opacity-80 transition-opacity">
                                  <AvatarImage src={avatarUrl || undefined} alt={fullName} />
                                  <AvatarFallback>{initials}</AvatarFallback>
                                </Avatar>
                              </button>

                              {/* Worker Info */}
                              <div className="flex-1 min-w-0">
                                <button
                                  type="button"
                                  onClick={(e) => handleWorkerClick(application, shift, e)}
                                  className="text-blue-600 hover:underline font-medium text-left truncate w-full"
                                >
                                  {fullName}
                                </button>
                                {phoneNumber && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.location.href = `tel:${phoneNumber}`;
                                    }}
                                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mt-1"
                                  >
                                    <Phone className="h-3 w-3" />
                                    <span>{phoneNumber}</span>
                                  </button>
                                )}
                              </div>

                              {/* Cancel Worker */}
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="h-8 w-8 flex-shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isEditable) return;
                                  openCancelDialog(
                                    application.id,
                                    profile.id,
                                    fullName,
                                    shift.start_time
                                  );
                                }}
                                disabled={isCancelPending || !isEditable}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <CancelWorkerDialog
        isOpen={cancelDialogOpen}
        onClose={closeCancelDialog}
        onConfirm={handleCancelConfirm}
        workerName={selectedWorkerName || ''}
        shiftStartTime={selectedShiftStart || new Date().toISOString()}
        isPending={isCancelPending}
      />
      <EditShiftDialog
        open={!!shiftToEdit}
        onOpenChange={(open) => {
          if (!open) {
            setShiftToEdit(null);
          }
        }}
        shift={shiftToEdit as any}
        lang={lang}
        locations={locations}
        createShiftDict={createShiftDict}
        shiftOptions={shiftOptions}
      />
      
      {/* Worker Profile Modal */}
      {selectedWorkerApplication && (
        <CandidateProfileModal
          open={workerModalOpen}
          onOpenChange={handleWorkerModalClose}
          application={selectedWorkerApplication}
          dict={{
            title: 'Worker Profile',
            about: 'About',
            contact: 'Contact',
            applicationMessage: 'Application Message',
            appliedFor: isArchive ? 'Worked on' : 'Assigned to',
            appliedAt: isArchive ? 'Completed' : 'Start Time',
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
          onSuccess={handleWorkerModalSuccess}
        />
      )}
    </div>
  );
}

