'use client';

import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import EditShiftForm from '@/components/shifts/EditShiftForm';
import { useToast } from '@/components/ui/use-toast';

interface Location {
  id: string;
  name: string;
  address: string;
}

interface ShiftForEdit {
  id: string;
  title: string;
  description: string | null;
  category: string;
  location_id: string;
  start_time: string;
  end_time: string;
  hourly_rate: number;
  break_minutes: number;
  is_break_paid: boolean;
  vacancies_total: number;
  vacancies_taken: number;
  is_urgent: boolean;
  possible_overtime: boolean;
  company_id: string;
  must_bring?: string | null;
  required_language_ids?: string[];
  required_licence_ids?: string[];
  locations: Location | null;
}

interface EditShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: ShiftForEdit | null;
  lang: string;
  locations: Location[];
  createShiftDict: any;
  shiftOptions: any;
}

export default function EditShiftDialog({
  open,
  onOpenChange,
  shift,
  lang,
  locations,
  createShiftDict,
  shiftOptions,
}: EditShiftDialogProps) {
  const router = useRouter();
  const { toast } = useToast();

  if (!shift) return null;

  const handleSuccess = () => {
    onOpenChange(false);
    toast({
      title: 'Shift updated',
      description: 'Your changes have been saved.',
      variant: 'default',
    });
    router.refresh();
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Edit Shift</DialogTitle>
          <DialogDescription>
            Make changes to the shift details below.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[80vh] px-6 pb-6">
          <EditShiftForm
            initialData={{
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
              is_urgent: shift.is_urgent,
              possible_overtime: shift.possible_overtime,
              must_bring: shift.must_bring ?? null,
              required_language_ids: shift.required_language_ids || [],
              required_licence_ids: shift.required_licence_ids || [],
              company_id: shift.company_id,
              locations: shift.locations,
            }}
            vacanciesTaken={shift.vacancies_taken}
            shiftId={shift.id}
            lang={lang}
            dict={createShiftDict}
            shiftOptions={shiftOptions}
            locations={locations}
            onSuccess={handleSuccess}
            onClose={handleClose}
            className="border-0 shadow-none"
          />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

