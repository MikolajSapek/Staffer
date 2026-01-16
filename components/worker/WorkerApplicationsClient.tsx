'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Calendar, Clock, MapPin, Wallet, Star } from 'lucide-react';
import { formatTime, formatDateShort } from '@/lib/date-utils';
import { cn } from '@/lib/utils';

interface Application {
  id: string;
  status: string;
  applied_at: string;
  worker_message: string | null;
  shift_id: string;
  shifts: {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    hourly_rate: number;
    locations: {
      name: string;
      address: string;
    } | null;
    profiles: {
      first_name?: string | null;
      avatar_url?: string | null;
      company_details: {
        company_name: string;
        logo_url: string | null;
      } | null;
    } | null;
  };
  review: {
    id: string;
    rating: number;
    comment: string | null;
    tags: string[] | null;
  } | null;
}

interface WorkerApplicationsClientProps {
  applications: Application[];
  dict: {
    workerApplications: {
      title: string;
      subtitle: string;
      noApplications: string;
      applied: string;
      date: string;
      time: string;
      rate: string;
      location: string;
      locationNotSpecified: string;
      statusPending: string;
      statusAccepted: string;
      statusRejected: string;
      statusWaitlist: string;
      message?: string;
    };
  };
}

export default function WorkerApplicationsClient({
  applications,
  dict,
}: WorkerApplicationsClientProps) {
  // Filtrowanie aplikacji z useMemo
  const { activeApps, archiveApps } = useMemo(() => {
    const now = new Date();

    // FILTR CLEANUP: Usuń wszystkie aplikacje ze statusem 'rejected', których termin już minął
    const filteredApps = (applications || []).filter((app) => {
      const shift = Array.isArray(app.shifts) ? app.shifts[0] : app.shifts;
      if (!shift) return false;

      // Usuń rejected aplikacje, których termin już minął
      if (app.status === 'rejected' && new Date(shift.end_time) < now) {
        return false;
      }

      return true;
    });

    // activeApps: wszystkie aplikacje, których shift.end_time > now()
    const active = filteredApps.filter((app) => {
      const shift = Array.isArray(app.shifts) ? app.shifts[0] : app.shifts;
      if (!shift) return false;
      return new Date(shift.end_time) > now;
    });

    // archiveApps: tylko aplikacje, gdzie status === 'accepted' AND shift.end_time < now()
    const archive = filteredApps.filter((app) => {
      const shift = Array.isArray(app.shifts) ? app.shifts[0] : app.shifts;
      if (!shift) return false;
      return app.status === 'accepted' && new Date(shift.end_time) < now;
    });

    return { activeApps: active, archiveApps: archive };
  }, [applications]);

  const getStatusBadge = (status: string, isArchive: boolean = false) => {
    if (isArchive) {
      return (
        <Badge className="bg-green-500 hover:bg-green-600 text-white">
          Completed
        </Badge>
      );
    }

    const displayStatus = status === 'accepted' ? 'approved' : status;

    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      approved: 'default',
      accepted: 'default',
      pending: 'secondary',
      rejected: 'destructive',
      waitlist: 'outline',
      completed: 'outline',
    };

    const labels: Record<string, string> = {
      approved: dict.workerApplications.statusAccepted || 'Approved',
      accepted: dict.workerApplications.statusAccepted || 'Accepted',
      pending: dict.workerApplications.statusPending,
      rejected: dict.workerApplications.statusRejected,
      waitlist: dict.workerApplications.statusWaitlist,
      completed: 'Completed',
    };

    return (
      <Badge variant={variants[displayStatus] || 'secondary'}>
        {labels[displayStatus] || status}
      </Badge>
    );
  };

  const getCompanyName = (shift: Application['shifts']) => {
    // Użyj first_name z profiles, jeśli dostępne, w przeciwnym razie company_name z company_details
    return (
      shift.profiles?.first_name ||
      shift.profiles?.company_details?.company_name ||
      'Unknown Company'
    );
  };

  const getCompanyLogo = (shift: Application['shifts']) => {
    // Użyj avatar_url z profiles, jeśli dostępne, w przeciwnym razie logo_url z company_details
    return shift.profiles?.avatar_url || shift.profiles?.company_details?.logo_url || null;
  };

  const renderApplicationCard = (app: Application, isArchive: boolean = false) => {
    const shift = Array.isArray(app.shifts) ? app.shifts[0] : app.shifts;
    if (!shift) return null;

    const companyName = getCompanyName(shift);
    const companyLogo = getCompanyLogo(shift);
    const companyInitials = companyName.substring(0, 2).toUpperCase();

    return (
      <div
        key={app.id}
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
      >
        <div className="flex items-start gap-4">
          {/* Lewa sekcja - Logotyp firmy */}
          <div className="flex-shrink-0">
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
              {companyLogo ? (
                <img
                  src={companyLogo}
                  alt={companyName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-lg font-semibold text-gray-600">
                  {companyInitials}
                </span>
              )}
            </div>
          </div>

          {/* Środkowa sekcja - Tytuł i szczegóły */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-3">
              <h3 className="text-lg font-bold text-gray-900 truncate">
                {shift.title}
              </h3>
              {/* Status badge - prawy górny róg */}
              <div className="flex-shrink-0">
                {getStatusBadge(app.status, isArchive)}
              </div>
            </div>

            <div className="space-y-2">
              {/* Data */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span>{formatDateShort(shift.start_time)}</span>
              </div>

              {/* Godziny */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span>
                  {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                </span>
              </div>

              {/* Lokalizacja */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="truncate">
                  {shift.locations?.name || dict.workerApplications.locationNotSpecified}
                </span>
              </div>
              {shift.locations?.address && (
                <div className="text-xs text-gray-500 ml-6">
                  {shift.locations.address}
                </div>
              )}

              {/* Stawka */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Wallet className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span>{shift.hourly_rate} DKK/t</span>
              </div>
            </div>

            {/* Opcjonalna wiadomość pracownika */}
            {app.worker_message && (
              <div className="mt-4 pt-4 border-t border-gray-100 bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 whitespace-pre-wrap break-words">
                  <span className="font-medium text-gray-700">
                    {dict.workerApplications.message || 'Your message'}:
                  </span>{' '}
                  {app.worker_message}
                </p>
              </div>
            )}

            {/* Company Feedback Section */}
            {app.review && (
              <div className="mt-4 pt-4 border-t border-gray-100 bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="font-medium text-sm text-gray-900">Company Feedback:</div>

                {/* Star Rating */}
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        'h-4 w-4',
                        star <= app.review!.rating
                          ? 'fill-yellow-400 stroke-yellow-400'
                          : 'fill-gray-300 stroke-gray-300'
                      )}
                    />
                  ))}
                  <span className="text-xs text-gray-600 ml-1">
                    {app.review.rating}/5
                  </span>
                </div>

                {/* Comment */}
                {app.review.comment && (
                  <div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {app.review.comment}
                    </p>
                  </div>
                )}

                {/* Tags */}
                {app.review.tags && app.review.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {app.review.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderEmptyState = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
      <p className="text-gray-600">{dict.workerApplications.noApplications}</p>
    </div>
  );

  return (
    <Tabs defaultValue="active" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="active">My Applications</TabsTrigger>
        <TabsTrigger value="archive">Archive Shifts</TabsTrigger>
      </TabsList>

      <TabsContent value="active" className="mt-6">
        {activeApps.length === 0 ? (
          renderEmptyState()
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeApps.map((app) => renderApplicationCard(app, false))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="archive" className="mt-6">
        {archiveApps.length === 0 ? (
          renderEmptyState()
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {archiveApps.map((app) => renderApplicationCard(app, true))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
