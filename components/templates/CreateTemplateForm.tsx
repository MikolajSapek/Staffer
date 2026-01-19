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
import { createTemplate } from '@/app/actions/templates';
import { TimePicker } from '@/components/ui/time-picker';

interface CreateTemplateFormProps {
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
    templateName: string;
    templateNamePlaceholder: string;
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
    saving: string;
    cancel: string;
    successTitle: string;
    successMessage: string;
    redirecting: string;
    validation: {
      templateNameRequired: string;
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

export default function CreateTemplateForm({ 
  companyId, 
  locations: initialLocations, 
  locationFormDict, 
  dict, 
  shiftOptions, 
  lang 
}: CreateTemplateFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [locations, setLocations] = useState<Array<{ id: string; name: string; address: string }>>(initialLocations);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  
  // Skills state
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    template_name: '',
    title: '',
    description: '',
    category: '',
    location_id: initialLocations.length > 0 ? initialLocations[0].id : '',
    start_time: '09:00', // Time only format
    end_time: '17:00',   // Time only format
    hourly_rate: '',
    break_minutes: '0',
    is_break_paid: false,
    vacancies_total: '1',
    possible_overtime: false,
    must_bring: '',
  });

  // Fetch skills on mount
  useEffect(() => {
    async function fetchSkills() {
      try {
        const supabase = createClient();
        
        const { data: skillsData, error: skillsError } = await supabase
          .from('skills')
          .select('id, name, category')
          .order('name', { ascending: true });

        if (!skillsError && skillsData) {
          setAvailableSkills(skillsData);
        }
      } catch (err) {
        console.error('Error fetching skills:', err);
      }
    }

    fetchSkills();
  }, []);

  // Handle location creation success
  const handleLocationCreated = (newLocation: { id: string; name: string; address: string }) => {
    setLocations((prev) => [newLocation, ...prev]);
    setFormData((prev) => ({ ...prev, location_id: newLocation.id }));
  };

  const validateForm = (): string | null => {
    if (!formData.template_name.trim()) {
      return dict.validation.templateNameRequired;
    }
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
    if (!formData.end_time) {
      return dict.validation.endTimeRequired;
    }
    if (!formData.hourly_rate || parseFloat(formData.hourly_rate) <= 0) {
      return dict.validation.hourlyRateRequired;
    }
    if (!formData.vacancies_total || parseInt(formData.vacancies_total) < 1) {
      return dict.validation.vacanciesRequired;
    }

    // Validate that end time is after start time
    if (formData.start_time && formData.end_time) {
      const [startHour, startMin] = formData.start_time.split(':').map(Number);
      const [endHour, endMin] = formData.end_time.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      
      if (endMinutes <= startMinutes) {
        return dict.validation.endTimeAfterStart;
      }
      
      // Validate minimum duration (2 hours = 120 minutes)
      const diffInMinutes = endMinutes - startMinutes;
      if (diffInMinutes < 120) {
        return dict.validation.minShiftDuration;
      }
    }

    return null;
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
      // Filter to only language skills (business decision)
      const languageSkillIds = selectedSkillIds.filter(id => {
        const skill = availableSkills.find(s => s.id === id);
        return skill && skill.category === 'language';
      });
      
      const templateResult = await createTemplate({
        template_name: formData.template_name.trim(),
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        category: formData.category,
        location_id: formData.location_id || null,
        hourly_rate: parseFloat(formData.hourly_rate),
        vacancies_total: parseInt(formData.vacancies_total),
        must_bring: formData.must_bring.trim() || null,
        break_minutes: parseInt(formData.break_minutes) || 0,
        is_break_paid: parseInt(formData.break_minutes) > 0 ? formData.is_break_paid : false,
        skill_ids: languageSkillIds,
      });

      if (!templateResult.success) {
        throw new Error(templateResult.error || 'Failed to create template');
      }

      // Show success message
      setSuccess(true);

      // Redirect to templates list after 1.5 seconds
      setTimeout(() => {
        router.push(`/${lang}/templates`);
      }, 1500);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create template';
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

            {/* Template Name - TOP OF FORM */}
            <div className="space-y-2">
              <Label htmlFor="template-name">
                {dict.templateName} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="template-name"
                value={formData.template_name}
                onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                placeholder={dict.templateNamePlaceholder}
                required
                disabled={loading}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Give this template a memorable name for quick access
              </p>
            </div>

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

            {/* Time Pickers (no date) */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start_time">
                  {dict.startTime} <span className="text-red-500">*</span>
                </Label>
                <TimePicker
                  id="start_time"
                  value={formData.start_time}
                  onChange={(value) => setFormData({ ...formData, start_time: value })}
                  required
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Typical start time for this role
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">
                  {dict.endTime} <span className="text-red-500">*</span>
                </Label>
                <TimePicker
                  id="end_time"
                  value={formData.end_time}
                  onChange={(value) => setFormData({ ...formData, end_time: value })}
                  required
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Typical end time for this role
                </p>
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
                    is_break_paid: breakMinutes === '0' ? false : formData.is_break_paid
                  });
                }}
                disabled={loading}
              >
                <SelectTrigger id="break_minutes" className="w-full">
                  <SelectValue placeholder={shiftOptions.breaks?.placeholder || 'Select break duration'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No break</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Break Payment Status - Only show if break_minutes > 0 */}
              {Number(formData.break_minutes) > 0 && (
                <div className="mt-4 p-4 border rounded-md bg-gray-50 space-y-3">
                  <Label className="text-base font-semibold">
                    {dict.breakPaymentStatus || 'Is this break paid?'}
                  </Label>
                  <div className="flex flex-col gap-2">
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
          </div>

          {/* Possible Overtime */}
          <div className="space-y-4 pt-4 border-t">
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
                    {dict.saving}
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
