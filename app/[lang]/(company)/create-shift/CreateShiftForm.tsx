'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { createClient } from '@/utils/supabase/client';
import { Loader2, AlertCircle, CheckCircle2, Plus } from 'lucide-react';
import CreateLocationModal from '@/components/CreateLocationModal';
import { fromZonedTime } from 'date-fns-tz';
import { z } from 'zod';

interface CreateShiftFormProps {
  companyId: string;
  locations: Array<{ id: string; name: string; address: string }>;
  locationFormDict: {
    addTitle: string;
    addDescription: string;
    nameLabel: string;
    namePlaceholder: string;
    addressLabel: string;
    addressPlaceholder: string;
    save: string;
    creating: string;
    cancel: string;
    nameRequired: string;
    notLoggedIn: string;
    createError: string;
  };
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
    breakDuration?: string;
    breakDurationHint?: string;
    breakPaymentStatus?: string;
    breakPaid?: string;
    breakUnpaid?: string;
    breakPaidHint?: string;
    breakUnpaidHint?: string;
    possibleOvertime?: string;
    possibleOvertimeHint?: string;
    vacancies: string;
    vacanciesHint: string;
    location: string;
    category: string;
    selectLocation: string;
    selectCategory: string;
    noLocations: string;
    goToLocations: string;
    submit: string;
    creating: string;
    cancel: string;
    successTitle: string;
    successMessage: string;
    redirecting: string;
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
      companyProfileIncomplete?: string;
    };
    templates: {
      loadTemplate: string;
      selectTemplatePlaceholder: string;
      saveAsTemplate: string;
      templateName: string;
      templateNamePlaceholder: string;
      templateSaved: string;
      templateNameRequired: string;
    };
  };
  shiftOptions: {
    roles: {
      placeholder: string;
      waiter: string;
      bartender: string;
      chef: string;
      dishwasher: string;
      runner: string;
      manager: string;
      cleaning: string;
    };
    breaks: {
      placeholder: string;
      none: string;
      '15min': string;
      '30min': string;
      '45min': string;
      '60min': string;
    };
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
  lang: string;
}

// Job category values (used as keys for dictionary lookups)
const JOB_CATEGORY_VALUES = [
  'gastronomy',
  'warehouse',
  'production',
  'retail',
  'hospitality',
  'cleaning',
  'construction',
  'logistics',
  'office',
  'healthcare',
  'other',
] as const;

interface Skill {
  id: string;
  name: string;
  category: 'language' | 'license';
}

interface ShiftTemplate {
  id: string;
  template_name: string;
  title: string;
  description: string | null;
  category: string;
  hourly_rate: number;
  vacancies_total: number;
  location_id: string;
}

// Ensure start time is in the future
const formSchema = z.object({
  start_time: z.string(),
}).refine(({ start_time }) => {
  if (!start_time) return false;
  const start = new Date(start_time);
  if (Number.isNaN(start.getTime())) return false;
  return start > new Date();
}, {
  message: 'Start time must be in the future',
  path: ['start_time'],
});

export default function CreateShiftForm({ companyId, locations: initialLocations, locationFormDict, dict, shiftOptions, lang }: CreateShiftFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [locations, setLocations] = useState<Array<{ id: string; name: string; address: string }>>(initialLocations);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  
  // Skills state
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]); // Track selected skill IDs

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    location_id: initialLocations.length > 0 ? initialLocations[0].id : '',
    start_time: '',
    end_time: '',
    hourly_rate: '',
    break_minutes: '0',
    is_break_paid: false,
    vacancies_total: '1',
    is_urgent: false,
    possible_overtime: false,
    must_bring: '',
  });
  // Fetch templates on mount
  useEffect(() => {
    async function fetchTemplates() {
      try {
        const supabase = createClient();
        
        // Fetch available skills
        const { data: skillsData, error: skillsError } = await supabase
          .from('skills')
          .select('id, name, category')
          .order('name', { ascending: true });

        if (!skillsError && skillsData) {
          setAvailableSkills(skillsData);
        }
        
        const { data, error } = await supabase
          .from('shift_templates' as any)
          .select('*')
          .eq('company_id', companyId)
          .order('template_name', { ascending: true }) as any;

        if (error) {
          return;
        }

        setTemplates(data || []);
      } catch (err) {
        // Error fetching templates - continue without them
      }
    }

    fetchTemplates();
  }, [companyId]);

  // Load template when selected
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;

    const template = templates.find(t => t.id === templateId);
    if (template) {
      setFormData({
        ...formData,
        title: template.title || '',
        description: template.description || '',
        category: template.category || '',
        location_id: template.location_id || (locations.length > 0 ? locations[0].id : ''),
        hourly_rate: template.hourly_rate?.toString() || '',
        vacancies_total: template.vacancies_total?.toString() || '1',
        // Don't overwrite start_time and end_time
      });
    }
  };

  // Handle location creation success
  const handleLocationCreated = (newLocation: { id: string; name: string; address: string }) => {
    // Add the new location to the list
    setLocations((prev) => [newLocation, ...prev]);
    // Auto-select the new location
    setFormData((prev) => ({ ...prev, location_id: newLocation.id }));
  };

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

    // Validate template name if saving as template
    if (saveAsTemplate && !templateName.trim()) {
      return dict.templates.templateNameRequired;
    }

    // Validate that end time is after start time
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

  const minStartDateTime = new Date().toISOString().slice(0, 16);
  const minEndDateTime = formData.start_time
    ? formData.start_time.slice(0, 16)
    : minStartDateTime;

  const handleStartDateTimeChange = (value: string) => {
    const valueWithSeconds = value ? `${value}:00` : '';
    setFormData({ ...formData, start_time: valueWithSeconds });
  };

  const handleEndDateTimeChange = (value: string) => {
    const valueWithSeconds = value ? `${value}:00` : '';
    setFormData({ ...formData, end_time: valueWithSeconds });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validate form
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      // Get the current authenticated user - company_id must match auth.uid()
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Check if company profile is complete
      const { data: companyDetails, error: companyError } = await supabase
        .from('company_details')
        .select('company_name, cvr_number, main_address')
        .eq('profile_id', user.id)
        .single();

      if (companyError?.code === 'PGRST116') {
        setError('Access denied. Please contact support if this persists.');
        setLoading(false);
        return;
      }

      if (companyError || !companyDetails) {
        throw new Error('Company profile not found. Please complete your company setup first.');
      }

      // Validate that required fields are filled
      const profile = companyDetails as {
        company_name: string | null;
        cvr_number: string | null;
        main_address: string | null;
      };

      if (!profile.company_name || !profile.company_name.trim()) {
        throw new Error(dict.validation.companyProfileIncomplete || 'Company profile is incomplete. Please complete your company profile first.');
      }

      if (!profile.cvr_number || !profile.cvr_number.trim()) {
        throw new Error(dict.validation.companyProfileIncomplete || 'Company profile is incomplete. Please complete your company profile first.');
      }

      if (!profile.main_address || !profile.main_address.trim()) {
        throw new Error(dict.validation.companyProfileIncomplete || 'Company profile is incomplete. Please complete your company profile first.');
      }

      // Convert local time strings to UTC using Copenhagen timezone
      const timeZone = 'Europe/Copenhagen';
      
      // Convert "2026-01-01T09:00" (Denmark time) -> UTC Date Object
      const startUtc = fromZonedTime(formData.start_time, timeZone);
      const endUtc = fromZonedTime(formData.end_time, timeZone);

      // Construct the payload with proper data types
      const payload = {
        company_id: user.id, // CRITICAL: Must match auth.uid() for RLS policy
        location_id: formData.location_id || null,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        category: formData.category,
        start_time: startUtc.toISOString(), // Send explicit UTC
        end_time: endUtc.toISOString(),
        hourly_rate: parseFloat(formData.hourly_rate),
        break_minutes: parseInt(formData.break_minutes) || 0,
        is_break_paid: parseInt(formData.break_minutes) > 0 ? formData.is_break_paid : false,
        vacancies_total: parseInt(formData.vacancies_total),
        vacancies_taken: 0,
        status: 'published' as const,
        is_urgent: formData.is_urgent,
        possible_overtime: formData.possible_overtime,
        must_bring: formData.must_bring.trim() || null,
      };

      // Insert the shift and get the new shift ID
      const { data: newShift, error: shiftError } = await supabase
        .from('shifts')
        .insert(payload as any)
        .select('id')
        .single();

      if (shiftError || !newShift) {
        console.error('Failed to create shift:', JSON.stringify(shiftError, null, 2));
        throw shiftError || new Error('Failed to create shift');
      }

      const newShiftId = (newShift as any).id;

      // CRITICAL: Save shift requirements using newShiftId
      // Requirements MUST be saved for data integrity
      if (selectedSkillIds.length > 0) {
        const requirementsToInsert = selectedSkillIds.map((skillId) => ({
          shift_id: newShiftId,
          skill_id: skillId,
        }));

        const { error: requirementsError } = await (supabase
          .from('shift_requirements') as any)
          .insert(requirementsToInsert)
          .select();

        if (requirementsError) {
          const errorMessage = requirementsError.message 
            ? `Database error: ${requirementsError.message}` 
            : 'Unknown database error. The shift_requirements table may not exist.';

          alert(`⚠️ CRITICAL ERROR\n\nShift created successfully, but failed to save requirements.\n\n${errorMessage}\n\nPlease edit the shift to add requirements, or contact support.`);

          setError(`Shift created, but failed to save requirements. ${errorMessage} Please edit the shift to add requirements.`);
          setLoading(false);
          return;
        }
      }

      // Save as template if checkbox is checked
      if (saveAsTemplate && templateName.trim()) {
        const templatePayload = {
          company_id: user.id,
          template_name: templateName.trim(),
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          category: formData.category,
          hourly_rate: parseFloat(formData.hourly_rate),
          vacancies_total: parseInt(formData.vacancies_total),
          location_id: formData.location_id || null,
        };

        const { error: templateError } = await supabase
          .from('shift_templates')
          .insert(templatePayload as any);

        if (templateError) {
          // Don't throw - shift was created successfully, template save is secondary
        }
      }

      // Show success message
      setSuccess(true);

      // Refresh to sync server state and redirect after 1.5 seconds
      router.refresh();
      setTimeout(() => {
        router.push(`/${lang}/dashboard`);
      }, 1500);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : dict.validation.titleRequired;
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.formTitle}</CardTitle>
        <CardDescription>
          {dict.formDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {success ? (
          <div className="py-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">{dict.successTitle}</h3>
                <div className="text-sm text-muted-foreground">
                  {dict.successMessage}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {dict.redirecting}
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 text-sm text-red-600 bg-red-50 rounded-md border border-red-200 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1">{error}</div>
              </div>
            )}

            {/* Load Template Dropdown */}
            {templates.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="template-select">{dict.templates.loadTemplate}</Label>
                <Select
                  value={selectedTemplateId || undefined}
                  onValueChange={handleTemplateSelect}
                  disabled={loading}
                >
                  <SelectTrigger id="template-select" className="w-full">
                    <SelectValue placeholder={dict.templates.selectTemplatePlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.template_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                {locations.length > 0 ? (
                  <div className="space-y-2">
                    <Select
                      value={formData.location_id}
                      onValueChange={(value) => setFormData({ ...formData, location_id: value })}
                      disabled={loading}
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
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setLocationModalOpen(true)}
                      disabled={loading}
                      className="w-full"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {dict.goToLocations}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {dict.noLocations}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setLocationModalOpen(true)}
                      disabled={loading}
                      className="w-full"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {dict.goToLocations}
                    </Button>
                  </div>
                )}
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
                    {JOB_CATEGORY_VALUES.map((categoryValue) => (
                      <SelectItem key={categoryValue} value={categoryValue}>
                        {shiftOptions.categories[categoryValue]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                    step={60}
                    value={formData.start_time ? formData.start_time.slice(0, 16) : ''}
                    onChange={(e) => handleStartDateTimeChange(e.target.value)}
                    min={minStartDateTime}
                    required
                    disabled={loading}
                    className="w-full"
                  />
                  {error?.includes('Start time must be in the future') && (
                    <p className="text-sm text-red-600">
                      Start time must be in the future
                    </p>
                  )}
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
                    step={60}
                    value={formData.end_time ? formData.end_time.slice(0, 16) : ''}
                    onChange={(e) => handleEndDateTimeChange(e.target.value)}
                    min={minEndDateTime}
                    required
                    disabled={loading}
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
                  min="0.01"
                  value={formData.hourly_rate}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Only allow positive numbers
                    if (value === '' || (parseFloat(value) > 0)) {
                      setFormData({ ...formData, hourly_rate: value });
                    }
                  }}
                  placeholder={dict.hourlyRatePlaceholder}
                  required
                  disabled={loading}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  {dict.hourlyRateHint}
                </p>
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
                    // Only allow positive integers
                    if (value === '' || (parseInt(value) >= 1)) {
                      setFormData({ ...formData, vacancies_total: value });
                    }
                  }}
                  required
                  disabled={loading}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  {dict.vacanciesHint}
                </p>
              </div>
            </div>

            {/* Break Duration */}
            <div className="space-y-2">
              <Label htmlFor="break_minutes">
                {dict.breakDuration || 'Break Duration'}
              </Label>
              <Select
                value={formData.break_minutes}
                onValueChange={(value) => {
                  const breakMinutes = value;
                  setFormData({ 
                    ...formData, 
                    break_minutes: breakMinutes,
                    // Reset is_break_paid to false when break is set to 0
                    is_break_paid: breakMinutes === '0' ? false : formData.is_break_paid
                  });
                }}
                disabled={loading}
              >
                <SelectTrigger id="break_minutes" className="w-full">
                  <SelectValue placeholder={shiftOptions.breaks?.placeholder || 'Select break duration'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">
                    No break
                  </SelectItem>
                  <SelectItem value="15">
                    15 minutes
                  </SelectItem>
                  <SelectItem value="30">
                    30 minutes
                  </SelectItem>
                  <SelectItem value="45">
                    45 minutes
                  </SelectItem>
                  <SelectItem value="60">
                    60 minutes
                  </SelectItem>
                </SelectContent>
              </Select>
              
              {/* Break Payment Status - Only show if break_minutes > 0 */}
              {Number(formData.break_minutes) > 0 && (
                <div className="mt-4 p-4 border rounded-md bg-gray-50 space-y-3">
                  <Label className="text-base font-semibold">
                    {dict.breakPaymentStatus || 'Is this break paid?'}
                  </Label>
                  <div className="flex flex-col gap-2">
                    {/* Option: UNPAID */}
                    <label className="flex items-center space-x-3 cursor-pointer p-2 rounded hover:bg-white border border-transparent hover:border-gray-200">
                      <input 
                        type="radio" 
                        name="is_break_paid" 
                        checked={formData.is_break_paid === false} 
                        onChange={() => setFormData({ ...formData, is_break_paid: false })}
                        disabled={loading}
                        className="h-4 w-4 text-primary"
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">Unpaid (Deducted)</span>
                        <span className="text-xs text-muted-foreground">Time is deducted from total pay</span>
                      </div>
                    </label>

                    {/* Option: PAID */}
                    <label className="flex items-center space-x-3 cursor-pointer p-2 rounded hover:bg-white border border-transparent hover:border-gray-200">
                      <input 
                        type="radio" 
                        name="is_break_paid" 
                        checked={formData.is_break_paid === true} 
                        onChange={() => setFormData({ ...formData, is_break_paid: true })}
                        disabled={loading}
                        className="h-4 w-4 text-green-600 focus:ring-green-500"
                      />
                      <div className="flex flex-col">
                        <span className="font-medium text-green-700">Paid (Included)</span>
                        <span className="text-xs text-green-600">Worker gets paid for this time</span>
                      </div>
                    </label>
                  </div>
                </div>
              )}
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
            <p className="text-xs text-muted-foreground">
              {dict.descriptionHint}
            </p>
          </div>

          {/* Must Bring Section */}
          <div className="space-y-2">
            <Label htmlFor="must_bring">Must Bring</Label>
            <Input
              id="must_bring"
              value={formData.must_bring}
              onChange={(e) => setFormData({ ...formData, must_bring: e.target.value })}
              placeholder="e.g., Black shoes, Work uniform, Safety vest"
              disabled={loading}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Items or equipment the worker must bring to this shift
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
                        checked={selectedSkillIds.includes(skill.id)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSelectedSkillIds(prev =>
                            checked
                              ? [...prev, skill.id]
                              : prev.filter(id => id !== skill.id)
                          );
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

            {/* Required Licences */}
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
                        checked={selectedSkillIds.includes(skill.id)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSelectedSkillIds(prev =>
                            checked
                              ? [...prev, skill.id]
                              : prev.filter(id => id !== skill.id)
                          );
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
          </div>

          {/* Boolean Flags - Urgent and Possible Overtime */}
          <div className="space-y-4 pt-4 border-t">
              {/* Mark as Urgent */}
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

              {/* Possible Overtime */}
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
                    {dict.possibleOvertimeHint || 'Signal that extra hours might be available/required.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Save as Template */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="save-as-template"
                  checked={saveAsTemplate}
                  onChange={(e) => setSaveAsTemplate(e.target.checked)}
                  disabled={loading}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="save-as-template" className="cursor-pointer">
                  {dict.templates.saveAsTemplate}
                </Label>
              </div>
              {saveAsTemplate && (
                <div className="space-y-2 pl-6">
                  <Label htmlFor="template-name">
                    {dict.templates.templateName} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="template-name"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder={dict.templates.templateNamePlaceholder}
                    required={saveAsTemplate}
                    disabled={loading}
                    className="w-full"
                  />
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
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
        )}
      </CardContent>
      <CreateLocationModal
        open={locationModalOpen}
        onOpenChange={setLocationModalOpen}
        dict={locationFormDict}
        onSuccess={handleLocationCreated}
      />
    </Card>
  );
}

