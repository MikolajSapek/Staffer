'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';
import { z } from 'zod';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { updateShiftAction } from '@/app/actions/shifts';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/utils/supabase/client';
import { toLocalISO, fromLocalISO, getCurrentLocalISO } from '@/lib/date-utils';

interface Skill {
  id: string;
  name: string;
  category: 'language' | 'license';
}

interface Location {
  id: string;
  name: string;
  address: string;
}

interface Manager {
  id: string;
  first_name: string;
  last_name: string;
}

interface EditShiftFormProps {
  initialData: {
    title: string;
    description: string | null;
    category: string;
    location_id: string;
    manager_id?: string | null;
    start_time: string;
    end_time: string;
    hourly_rate: number;
    break_minutes: number;
    is_break_paid: boolean;
    vacancies_total: number;
    is_urgent: boolean;
    possible_overtime: boolean;
    must_bring: string | null;
    required_language_ids: string[];
    required_licence_ids: string[];
    company_id: string;
    locations?: Location | null;
  };
  vacanciesTaken: number;
  shiftId: string;
  lang: string;
  dict: {
    formTitle: string;
    formDescription: string;
    jobTitle: string;
    jobTitlePlaceholder: string;
    description: string;
    descriptionPlaceholder: string;
    descriptionHint: string;
    startTime: string;
    endTime: string;
    hourlyRate: string;
    hourlyRatePlaceholder: string;
    hourlyRateHint: string;
    possibleOvertime?: string;
    possibleOvertimeHint?: string;
    vacancies: string;
    vacanciesHint: string;
    location: string;
    category: string;
    selectLocation: string;
    selectCategory: string;
    submit: string;
    creating: string;
    cancel: string;
    validation: {
      titleRequired: string;
      locationRequired: string;
      categoryRequired: string;
      startTimeRequired: string;
      endTimeRequired: string;
      hourlyRateRequired: string;
      vacanciesRequired: string;
      endTimeAfterStart: string;
      minShiftDuration: string;
    };
  };
  shiftOptions: {
    categories: {
      gastronomy: string;
      warehouse: string;
      production: string;
      retail: string;
      hospitality: string;
      cleaning: string;
      construction: string;
      logistics: string;
      office: string;
      healthcare: string;
      other: string;
    };
  };
  locations: Array<{ id: string; name: string; address: string }>;
  managers?: Array<{ id: string; first_name: string; last_name: string }>;
  onSuccess?: () => void;
  onClose?: () => void;
  className?: string;
}

// Validation schema
const formSchema = z
  .object({
    start_time: z.string(),
  })
  .refine(
    ({ start_time }) => {
      if (!start_time) return false;
      const start = new Date(start_time);
      if (Number.isNaN(start.getTime())) return false;
      return start > new Date();
    },
    {
      message: 'Start time must be in the future',
      path: ['start_time'],
    }
  );

export default function EditShiftForm({
  initialData,
  vacanciesTaken,
  shiftId,
  lang,
  dict,
  shiftOptions,
  locations,
  managers = [],
  onSuccess,
  onClose,
  className,
}: EditShiftFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast, dismiss } = useToast();
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [availableManagers, setAvailableManagers] = useState<Manager[]>(managers);

  // Initialize form state with clean data mapping
  const [formData, setFormData] = useState({
    title: initialData.title || '',
    description: initialData.description || '',
    category: initialData.category || '',
    location_id: initialData.location_id || (locations[0]?.id ?? ''),
    manager_id: initialData.manager_id || '',
    start_time: toLocalISO(initialData.start_time),
    end_time: toLocalISO(initialData.end_time),
    hourly_rate: initialData.hourly_rate.toString(),
    break_minutes: initialData.break_minutes.toString(),
    is_break_paid: initialData.is_break_paid,
    vacancies_total: initialData.vacancies_total.toString(),
    is_urgent: initialData.is_urgent,
    possible_overtime: initialData.possible_overtime,
    // Fix data loss: Map must_bring explicitly to mustBring (form field name)
    // Never initialize as undefined - always use empty string to avoid React warnings
    mustBring: initialData?.must_bring || '',
    // Skills are already mapped as arrays of UUIDs from shift_requirements
    required_language_ids: initialData.required_language_ids || [],
    required_licence_ids: initialData.required_licence_ids || [],
  });

  // Fetch available skills and managers on mount
  useEffect(() => {
    async function fetchSkillsAndManagers() {
      try {
        const supabase = createClient();
        
        // Fetch skills
        const { data: skillsData, error: skillsError } = await supabase
          .from('skills')
          .select('id, name, category')
          .order('name', { ascending: true });

        if (!skillsError && skillsData) {
          setAvailableSkills(skillsData);
        }
        
        // Fetch managers if not passed as props
        if (managers.length === 0) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: managersData, error: managersError } = await supabase
              .from('managers')
              .select('id, first_name, last_name')
              .eq('company_id', user.id)
              .order('first_name', { ascending: true });

            if (!managersError && managersData) {
              setAvailableManagers(managersData);
            }
          }
        }
      } catch (err) {
        // Continue without skills/managers
      }
    }

    fetchSkillsAndManagers();
  }, [managers.length]);

  // Sync form data when initialData changes (handles async data loading)
  // This ensures must_bring, manager_id and required_language_ids are populated
  // even if they arrive after the initial render
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        category: initialData.category || '',
        location_id: initialData.location_id || (locations[0]?.id ?? ''),
        manager_id: initialData.manager_id || '',
        start_time: toLocalISO(initialData.start_time),
        end_time: toLocalISO(initialData.end_time),
        hourly_rate: initialData.hourly_rate.toString(),
        break_minutes: initialData.break_minutes.toString(),
        is_break_paid: initialData.is_break_paid,
        vacancies_total: initialData.vacancies_total.toString(),
        is_urgent: initialData.is_urgent,
        possible_overtime: initialData.possible_overtime,
        mustBring: initialData.must_bring || '',
        required_language_ids: initialData.required_language_ids || [],
        required_licence_ids: initialData.required_licence_ids || [],
      });
    }
  }, [initialData, locations]);

  const isLocked = vacanciesTaken > 0;

  const validateForm = (): string | null => {
    if (!formData.title.trim()) {
      return dict.validation.titleRequired;
    }
    if (!formData.location_id) {
      return dict.validation.locationRequired;
    }
    if (!formData.category) {
      return dict.validation.categoryRequired;
    }
    if (!formData.start_time) {
      return dict.validation.startTimeRequired;
    }
    const startTimeValidation = formSchema.safeParse({ start_time: formData.start_time });
    if (!startTimeValidation.success) {
      return startTimeValidation.error.issues[0]?.message || 'Start time must be in the future';
    }
    if (!formData.end_time) {
      return dict.validation.endTimeRequired;
    }
    if (!formData.hourly_rate || parseFloat(formData.hourly_rate) <= 0) {
      return dict.validation.hourlyRateRequired;
    }
    if (!formData.vacancies_total || parseInt(formData.vacancies_total) < 1) {
      return dict.validation.vacanciesRequired;
    }

    // Ensure end time is after start time
    if (formData.start_time && formData.end_time) {
      const start = new Date(formData.start_time);
      const end = new Date(formData.end_time);
      if (end <= start) {
        return dict.validation.endTimeAfterStart;
      }
      // Validate minimum shift duration (2 hours)
      const diffInHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      if (diffInHours < 2) {
        return dict.validation.minShiftDuration;
      }
    }

    return null;
  };

  // Format min datetime as YYYY-MM-DDTHH:mm for datetime-local input
  const minStartDateTime = getCurrentLocalISO();
  const minEndDateTime = formData.start_time || minStartDateTime;

  const handleStartDateTimeChange = (value: string) => {
    setFormData({ ...formData, start_time: value });
  };

  const handleEndDateTimeChange = (value: string) => {
    setFormData({ ...formData, end_time: value });
  };

  const handleCancel = () => {
    if (loading) return;
    if (onClose) onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      // Convert form's local time strings back to ISO string for Supabase
      // datetime-local inputs return values in format YYYY-MM-DDTHH:mm in local timezone
      const startTimeISO = fromLocalISO(formData.start_time);
      const endTimeISO = fromLocalISO(formData.end_time);

      const payload = {
        location_id: formData.location_id || null,
        manager_id: formData.manager_id && formData.manager_id !== 'none' ? formData.manager_id : null,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        category: formData.category,
        start_time: startTimeISO,
        end_time: endTimeISO,
        hourly_rate: parseFloat(formData.hourly_rate),
        break_minutes: parseInt(formData.break_minutes) || 0,
        is_break_paid: parseInt(formData.break_minutes) > 0 ? formData.is_break_paid : false,
        vacancies_total: parseInt(formData.vacancies_total),
        is_urgent: formData.is_urgent,
        possible_overtime: formData.possible_overtime,
        // Map mustBring back to must_bring for database
        must_bring: formData.mustBring.trim() || null,
        required_language_ids: formData.required_language_ids,
        required_licence_ids: [], // BUSINESS DECISION: Always send empty array (licenses hidden)
      };

      const result = await updateShiftAction(shiftId, payload);

      if (!result.success) {
        const errorMessage = result.error || result.message || 'Failed to update shift';
        setError(errorMessage);
        
        // Dismiss any existing toasts before showing error
        dismiss();
        toast({
          variant: 'destructive',
          title: 'Error updating shift',
          description: errorMessage,
        });
        
        setLoading(false);
        return;
      }

      // Dismiss any existing toasts before showing success
      dismiss();
      toast({
        variant: 'default',
        title: 'Success',
        description: result.message || 'Shift updated successfully',
      });

      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : dict.validation.titleRequired;
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{dict.formTitle}</CardTitle>
        <CardDescription>{dict.formDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {isLocked && (
            <Alert variant="warning">
              <AlertTitle>Date and Location locked</AlertTitle>
              <AlertDescription>
                Date and Location are locked because workers are already hired.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <div className="p-4 text-sm text-red-600 bg-red-50 rounded-md border border-red-200 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              {dict.jobTitle} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={dict.jobTitlePlaceholder}
              required
              disabled={loading}
              className="w-full"
            />
          </div>

          {/* Location and Category */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="location_id">
                {dict.location} <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.location_id}
                onValueChange={(value) => setFormData({ ...formData, location_id: value })}
                disabled={loading || isLocked}
                required
              >
                <SelectTrigger id="location_id" className="w-full">
                  <SelectValue placeholder={dict.selectLocation} />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">
                {dict.category} <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
                disabled={loading}
                required
              >
                <SelectTrigger id="category" className="w-full">
                  <SelectValue placeholder={dict.selectCategory} />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(shiftOptions.categories).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Shift Manager */}
          <div className="space-y-2">
            <Label htmlFor="manager_id">Shift Manager / Contact Person</Label>
            <Select
              value={formData.manager_id || 'none'}
              onValueChange={(value) => setFormData({ ...formData, manager_id: value })}
              disabled={loading}
            >
              <SelectTrigger id="manager_id" className="w-full">
                <SelectValue placeholder="Select a manager (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No manager</SelectItem>
                {availableManagers.map((manager) => (
                  <SelectItem key={manager.id} value={manager.id}>
                    {manager.first_name} {manager.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Assign a manager as the contact person for this shift
            </p>
          </div>

          {/* Date & Time */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>
                {dict.startTime} <span className="text-red-500">*</span>
              </Label>
              <div className="grid gap-2">
                <Input
                  id="start_time"
                  type="datetime-local"
                  step="60"
                  value={formData.start_time}
                  onChange={(e) => handleStartDateTimeChange(e.target.value)}
                  min={minStartDateTime}
                  required
                  disabled={loading || isLocked}
                  className="w-full"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>
                {dict.endTime} <span className="text-red-500">*</span>
              </Label>
              <div className="grid gap-2">
                <Input
                  id="end_time"
                  type="datetime-local"
                  step="60"
                  value={formData.end_time}
                  onChange={(e) => handleEndDateTimeChange(e.target.value)}
                  min={minEndDateTime}
                  required
                  disabled={loading || isLocked}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Hourly Rate and Vacancies */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hourly_rate">
                {dict.hourlyRate} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="hourly_rate"
                type="number"
                step="0.01"
                min={isLocked ? initialData.hourly_rate : 0.01}
                value={formData.hourly_rate}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || parseFloat(value) > 0) {
                    setFormData({ ...formData, hourly_rate: value });
                  }
                }}
                placeholder={dict.hourlyRatePlaceholder}
                required
                disabled={loading}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">{dict.hourlyRateHint}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vacancies_total">
                {dict.vacancies} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="vacancies_total"
                type="number"
                min="1"
                value={formData.vacancies_total}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || parseInt(value) >= 1) {
                    setFormData({ ...formData, vacancies_total: value });
                  }
                }}
                required
                disabled={loading}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">{dict.vacanciesHint}</p>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{dict.description}</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder={dict.descriptionPlaceholder}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">{dict.descriptionHint}</p>
          </div>

          {/* Must Bring Section */}
          <div className="space-y-2">
            <Label htmlFor="must_bring">Must Bring</Label>
            <Input
              id="must_bring"
              value={formData.mustBring}
              onChange={(e) => setFormData({ ...formData, mustBring: e.target.value })}
              placeholder="e.g., Black shoes, Work uniform, Safety vest"
              disabled={loading}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Items or equipment the worker must bring
            </p>
          </div>

          {/* Requirements Section */}
          <div className="space-y-4 pt-2 border-t">
            <h3 className="text-base font-semibold">Requirements</h3>
            
            {/* Required Languages */}
            <div className="space-y-2">
              <Label>Required Languages</Label>
              <div className="grid grid-cols-2 gap-3 p-4 border rounded-md bg-gray-50">
                {availableSkills
                  .filter(skill => skill.category === 'language')
                  .map((skill) => (
                    <label
                      key={skill.id}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-white p-2 rounded transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={formData.required_language_ids.includes(skill.id)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFormData(prev => ({
                            ...prev,
                            required_language_ids: checked
                              ? [...prev.required_language_ids, skill.id]
                              : prev.required_language_ids.filter(id => id !== skill.id)
                          }));
                        }}
                        disabled={loading}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm font-medium">{skill.name}</span>
                    </label>
                  ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Leave unchecked if no language requirement
              </p>
            </div>

            {/* Required Licences - HIDDEN FOR NOW (business decision) */}
            {false && (
            <div className="space-y-2">
              <Label>Required Licences</Label>
              <div className="grid grid-cols-1 gap-3 p-4 border rounded-md bg-gray-50">
                {availableSkills
                  .filter(skill => skill.category === 'license')
                  .map((skill) => (
                    <label
                      key={skill.id}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-white p-2 rounded transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={formData.required_licence_ids.includes(skill.id)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFormData(prev => ({
                            ...prev,
                            required_licence_ids: checked
                              ? [...prev.required_licence_ids, skill.id]
                              : prev.required_licence_ids.filter(id => id !== skill.id)
                          }));
                        }}
                        disabled={loading}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm font-medium">{skill.name}</span>
                    </label>
                  ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Leave unchecked if no licences required
              </p>
            </div>
            )}
          </div>

          {/* Boolean Flags - Urgent and Possible Overtime */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-start space-x-2">
              <input
                type="checkbox"
                id="is_urgent"
                checked={formData.is_urgent}
                onChange={(e) => setFormData({ ...formData, is_urgent: e.target.checked })}
                disabled={loading}
                className="h-4 w-4 mt-1 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <div className="flex-1">
                <Label htmlFor="is_urgent" className="cursor-pointer font-medium">
                  Mark as Urgent / High Priority
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Highlight this shift to attract workers faster.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <input
                type="checkbox"
                id="possible_overtime"
                checked={formData.possible_overtime}
                onChange={(e) => setFormData({ ...formData, possible_overtime: e.target.checked })}
                disabled={loading}
                className="h-4 w-4 mt-1 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <div className="flex-1">
                <Label htmlFor="possible_overtime" className="cursor-pointer font-medium">
                  {dict.possibleOvertime || 'Possible Overtime'}
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {dict.possibleOvertimeHint ||
                    'Signal that extra hours might be available/required.'}
                </p>
              </div>
            </div>
          </div>

          {/* Submit / Cancel */}
          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
              className="flex-1 md:flex-initial"
            >
              {dict.cancel}
            </Button>
            <Button
              type="submit"
              disabled={loading || locations.length === 0}
              className="flex-1 md:flex-initial"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {dict.creating}
                </>
              ) : (
                dict.submit
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
