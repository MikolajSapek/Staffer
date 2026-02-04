'use client';

import React, { useMemo, useState } from 'react';
import { differenceInHours, isAfter, parseISO } from 'date-fns';
import { AlertTriangle } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const LATE_CANCELLATION_THRESHOLD_HOURS = 24;

interface WorkerCancelShiftDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  shiftTitle: string;
  shiftStartTime: string; // ISO string
  isPending: boolean;
  dict?: {
    title?: string;
    description?: string;
    lateTitle?: string;
    lateDescription?: string;
    earlyTitle?: string;
    earlyDescription?: string;
    keepShift?: string;
    confirmCancel?: string;
    cancelling?: string;
  };
}

export default function WorkerCancelShiftDialog({
  isOpen,
  onClose,
  onConfirm,
  shiftTitle,
  shiftStartTime,
  isPending,
  dict = {},
}: WorkerCancelShiftDialogProps) {
  const { isLateCancellation, isUpcomingShift } = useMemo(() => {
    try {
      const start = parseISO(shiftStartTime);
      const now = new Date();

      if (isNaN(start.getTime())) {
        return { isLateCancellation: false, isUpcomingShift: false };
      }

      const upcoming = isAfter(start, now);
      const diffHours = differenceInHours(start, now);

      return {
        isUpcomingShift: upcoming,
        isLateCancellation: upcoming && diffHours < LATE_CANCELLATION_THRESHOLD_HOURS,
      };
    } catch {
      return { isLateCancellation: false, isUpcomingShift: false };
    }
  }, [shiftStartTime]);

  const handleConfirm = () => {
    if (isPending) return;
    onConfirm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{dict.title || 'Cancel shift'}</DialogTitle>
          <DialogDescription>
            {dict.description || 'You are about to cancel your participation in'}{' '}
            <span className="font-medium text-foreground">{shiftTitle}</span>.
          </DialogDescription>
        </DialogHeader>

        {isUpcomingShift && isLateCancellation ? (
          <Alert variant="destructive" className="mt-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 text-red-600" />
            <div>
              <AlertTitle>
                {dict.lateTitle || 'UWAGA: Rezygnacja na mniej niż 24h przed zmianą skutkuje blokadą konta (BAN) na 30 dni.'}
              </AlertTitle>
              <AlertDescription>
                {dict.lateDescription ||
                  'Your account will be blocked for 30 days due to late cancellation. You will not be able to apply for new shifts until the ban expires.'}
              </AlertDescription>
            </div>
          </Alert>
        ) : isUpcomingShift ? (
          <Alert className="mt-2">
            <div>
              <AlertTitle>
                {dict.earlyTitle || 'Late cancellation recorded'}
              </AlertTitle>
              <AlertDescription>
                {dict.earlyDescription ||
                  'This cancellation will be recorded in your strike history. Repeated late cancellations may result in account restrictions.'}
              </AlertDescription>
            </div>
          </Alert>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            {dict.keepShift || 'Keep shift'}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? (dict.cancelling || 'Cancelling...') : (dict.confirmCancel || 'Confirm cancellation')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
