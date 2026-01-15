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
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface CancelWorkerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  workerName: string;
  shiftStartTime: string; // ISO string
  isPending: boolean;
}

const LATE_CANCELLATION_THRESHOLD_HOURS = 24;

export default function CancelWorkerDialog({
  isOpen,
  onClose,
  onConfirm,
  workerName,
  shiftStartTime,
  isPending,
}: CancelWorkerDialogProps) {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

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
    setTouched(true);
    const trimmed = reason.trim();
    if (!trimmed || isPending) return;
    onConfirm(trimmed);
  };

  const showReasonError = touched && !reason.trim();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel worker</DialogTitle>
          <DialogDescription>
            You are about to cancel{' '}
            <span className="font-medium text-foreground">{workerName}</span>{' '}
            from this shift.
          </DialogDescription>
        </DialogHeader>

        {isUpcomingShift && isLateCancellation ? (
          <Alert variant="destructive" className="mt-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 text-red-600" />
            <div>
              <AlertTitle>Late cancellation (&lt;24 hours)</AlertTitle>
              <AlertDescription>
                You will be charged a <span className="font-semibold">500 DKK</span> penalty
                for cancelling a worker less than 24 hours before the shift start time.
              </AlertDescription>
            </div>
          </Alert>
        ) : (
          <Alert className="mt-2">
            <div>
              <AlertTitle>Confirm cancellation</AlertTitle>
              <AlertDescription>
                Cancelling this worker will free up their spot on the shift. This action may be
                recorded in your account history.
              </AlertDescription>
            </div>
          </Alert>
        )}

        <div className="mt-4 space-y-2">
          <label className="text-sm font-medium text-foreground">
            Reason for cancellation
          </label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="Provide a short explanation for cancelling this worker..."
            rows={4}
          />
          {showReasonError && (
            <p className="text-xs text-red-600">
              A cancellation reason is required.
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            Keep worker
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending || !reason.trim()}
          >
            {isPending ? 'Cancelling...' : 'Confirm cancellation'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

