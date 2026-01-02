'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateShort, formatTime } from '@/lib/date-utils';
import { approveTimesheet } from '@/app/actions/timesheets';
import { Loader2 } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface ShiftApplication {
  id: string;
  status: string;
  worker_id: string;
  shifts: {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    hourly_rate: number;
  };
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    worker_details: {
      avatar_url: string | null;
    }[] | null;
  };
}

interface TimesheetsClientProps {
  applications: ShiftApplication[];
  processedApplicationIds: string[];
  dict: {
    timesheetsPage: {
      noPendingApprovals: string;
      pendingApprovals: string;
      workerName: string;
      shiftTitle: string;
      date: string;
      hoursWorked: string;
      totalDue: string;
      actions: string;
      hours: string;
      processing: string;
      approveAndGenerate: string;
    };
  };
  lang: string;
}

export default function TimesheetsClient({
  applications,
  processedApplicationIds,
  dict,
  lang,
}: TimesheetsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter out already processed applications
  const pendingApplications = applications.filter(
    (app) => !processedApplicationIds.includes(app.id)
  );

  const handleApprove = async (application: ShiftApplication) => {
    setProcessingId(application.id);
    setError(null);

    startTransition(async () => {
      const result = await approveTimesheet({
        applicationId: application.id,
        shiftId: application.shifts.id,
        workerId: application.worker_id,
        shiftTitle: application.shifts.title,
        startTime: application.shifts.start_time,
        endTime: application.shifts.end_time,
        hourlyRate: application.shifts.hourly_rate,
        workerFirstName: application.profiles.first_name,
        workerLastName: application.profiles.last_name,
        lang,
      });

      if (result.error) {
        setError(result.error);
        setProcessingId(null);
      } else {
        // Refresh the page to get updated data
        router.refresh();
      }
    });
  };

  const calculateHours = (startTime: string, endTime: string): number => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    const hours = diffMs / (1000 * 60 * 60); // Convert milliseconds to hours
    return parseFloat(hours.toFixed(2));
  };

  const calculateTotal = (hours: number, rate: number): number => {
    return parseFloat((hours * rate).toFixed(2));
  };

  if (pendingApplications.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">{dict.timesheetsPage.noPendingApprovals}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Card className="border-destructive">
          <CardContent className="py-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>{dict.timesheetsPage.pendingApprovals}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{dict.timesheetsPage.workerName}</TableHead>
                <TableHead>{dict.timesheetsPage.shiftTitle}</TableHead>
                <TableHead>{dict.timesheetsPage.date}</TableHead>
                <TableHead>{dict.timesheetsPage.hoursWorked}</TableHead>
                <TableHead>{dict.timesheetsPage.totalDue}</TableHead>
                <TableHead className="text-right">{dict.timesheetsPage.table.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingApplications.map((application) => {
                const hours = calculateHours(
                  application.shifts.start_time,
                  application.shifts.end_time
                );
                const total = calculateTotal(hours, application.shifts.hourly_rate);
                const firstName = application.profiles.first_name || '';
                const lastName = application.profiles.last_name || '';
                const workerName = `${firstName} ${lastName}`.trim() || 'Unknown';
                const avatarUrl = application.profiles.worker_details?.avatar_url || null;
                const initials = `${firstName.charAt(0) || ''}${lastName.charAt(0) || ''}`.toUpperCase() || '??';

                return (
                  <TableRow key={application.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={avatarUrl || undefined} alt={workerName} />
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{workerName}</div>
                          <div className="text-sm text-muted-foreground">
                            {application.profiles.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{application.shifts.title}</TableCell>
                    <TableCell>
                      {formatDateShort(application.shifts.start_time)}
                      <br />
                      <span className="text-sm text-muted-foreground">
                        {formatTime(application.shifts.start_time)} - {formatTime(application.shifts.end_time)}
                      </span>
                    </TableCell>
                    <TableCell>{hours} {dict.timesheetsPage.hours}</TableCell>
                    <TableCell className="font-medium">
                      {total.toFixed(2)} DKK
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        onClick={() => handleApprove(application)}
                        disabled={isPending && processingId === application.id}
                        size="sm"
                      >
                        {isPending && processingId === application.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {dict.timesheetsPage.processing}
                          </>
                        ) : (
                          dict.timesheetsPage.approveAndGenerate
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

