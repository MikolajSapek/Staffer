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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createClient } from '@/utils/supabase/client';
import { Loader2, AlertCircle, CheckCircle2, Plus } from 'lucide-react';
import { updateTemplate } from '@/app/actions/templates';
import { TimePicker } from '@/components/ui/time-picker';
import CreateLocationModal from '@/components/CreateLocationModal';
import Link from 'next/link';

// Job category values
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

interface ShiftTemplateRequirement {
  id: string;
  template_id: string;
  skill_id: string;
  skills?: {
    id: string;
    name: string;
    category: string;
  };
}

interface Location {
  id: string;
  name: string;
  address: string;
}

interface ShiftTemplate {
  id: string;
  company_id: string;
  location_id: string | null;
  manager_id: string | null;
  template_name: string;
  title: string;
  description: string | null;
  category: string;
  hourly_rate: number;
  vacancies_total: number;
  must_bring: string | null;
  break_minutes: number;
  is_break_paid: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  shift_template_requirements?: ShiftTemplateRequirement[];
  location?: Location;
}

interface EditTemplateDialogProps {
  template: ShiftTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  lang: string;
}

export default function EditTemplateDialog({
  template,
  open,
  onOpenChange,
  onSuccess,
  lang,
}: EditTemplateDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  
  // Skills state
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  
  // Managers state
  const [availableManagers, setAvailableManagers] = useState<Array<{ id: string; first_name: string; last_name: string }>>([]);

  const [formData, setFormData] = useState({
    template_name: '',
    title: '',
    description: '',
    category: '',
    location_id: '',
    manager_id: '',
    start_time: '09:00',
    end_time: '17:00',
    hourly_rate: '',
    break_minutes: '0',
    is_break_paid: false,
    vacancies_total: '1',
    possible_overtime: false,
    must_bring: '',
  });

  // Load template data into form when template changes
  useEffect(() => {
    if (template && open) {
      setFormData({
        template_name: template.template_name,
        title: template.title,
        description: template.description || '',
        category: template.category,
        location_id: template.location_id || '',
        manager_id: template.manager_id || '',
        start_time: '09:00', // Templates don't have time in DB yet
        end_time: '17:00',
        hourly_rate: template.hourly_rate.toString(),
        break_minutes: template.break_minutes.toString(),
        is_break_paid: template.is_break_paid,
        vacancies_total: template.vacancies_total.toString(),
        possible_overtime: false,
        must_bring: template.must_bring || '',
      });

      // Set selected skills from template requirements
      const skillIds = template.shift_template_requirements
        ?.map(req => req.skill_id)
        .filter((id): id is string => !!id) || [];
      setSelectedSkillIds(skillIds);
      
      setError(null);
      setSuccess(false);
    }
  }, [template, open]);

  // Fetch skills, managers, and locations on mount
  useEffect(() => {
    async function fetchData() {
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
        
        // Fetch managers and locations
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

          const { data: locationsData, error: locationsError } = await supabase
            .from('locations')
            .select('id, name, address')
            .eq('company_id', user.id)
            .order('name', { ascending: true });

          if (!locationsError && locationsData) {
            setLocations(locationsData);
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    }

    if (open) {
      fetchData();
    }
  }, [open]);

  // Handle location creation success
  const handleLocationCreated = (newLocation: Location) => {
    setLocations((prev) => [newLocation, ...prev]);
    setFormData((prev) => ({ ...prev, location_id: newLocation.id }));
  };

  const validateForm = (): string | null => {
    if (!formData.template_name.trim()) {
      return 'Template name is required';
    }
    if (!formData.title.trim()) {
      return 'Title is required';
    }
    if (!formData.category) {
      return 'Category is required';
    }
    if (!formData.hourly_rate || parseFloat(formData.hourly_rate) <= 0) {
      return 'Valid hourly rate is required';
    }
    if (!formData.vacancies_total || parseInt(formData.vacancies_total) < 1) {
      return 'At least 1 vacancy is required';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template) return;

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
      // Filter to only language skills
      const languageSkillIds = selectedSkillIds.filter(id => {
        const skill = availableSkills.find(s => s.id === id);
        return skill && skill.category === 'language';
      });
      
      const templateResult = await updateTemplate(template.id, {
        template_name: formData.template_name.trim(),
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        category: formData.category,
        location_id: formData.location_id || null,
        manager_id: formData.manager_id && formData.manager_id !== 'none' ? formData.manager_id : null,
        hourly_rate: parseFloat(formData.hourly_rate),
        vacancies_total: parseInt(formData.vacancies_total),
        must_bring: formData.must_bring.trim() || null,
        break_minutes: parseInt(formData.break_minutes) || 0,
        is_break_paid: parseInt(formData.break_minutes) > 0 ? formData.is_break_paid : false,
        skill_ids: languageSkillIds,
      });

      if (!templateResult.success) {
        throw new Error(templateResult.error || 'Failed to update template');
      }

      // Show success message briefly
      setSuccess(true);

      // Close dialog and refresh after 1 second
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
      }, 1000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update template';
      setError(errorMessage);
      setLoading(false);
    }
  };

  if (!template) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>
              Update the details of your shift template
            </DialogDescription>
          </DialogHeader>

          {success ? (
            <div className="py-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-full bg-green-100 p-3">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">Template Updated!</h3>
                  <div className="text-sm text-muted-foreground">
                    Your changes have been saved successfully
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6 py-4">
              {error && (
                <div className="p-4 text-sm text-red-600 bg-red-50 rounded-md border border-red-200 flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">{error}</div>
                </div>
              )}

              {/* Template Name */}
              <div className="space-y-2">
                <Label htmlFor="edit-template-name">
                  Template Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-template-name"
                  value={formData.template_name}
                  onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                  placeholder="e.g., Barista - Weekday Morning"
                  required
                  disabled={loading}
                />
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="edit-title">
                  Job Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Barista"
                  required
                  disabled={loading}
                />
              </div>

              {/* Location and Category */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-location_id">Location</Label>
                  {locations.length > 0 ? (
                    <div className="space-y-2">
                      <Select
                        value={formData.location_id}
                        onValueChange={(value) => setFormData({ ...formData, location_id: value })}
                        disabled={loading}
                      >
                        <SelectTrigger id="edit-location_id">
                          <SelectValue placeholder="Select location" />
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
                        Add Location
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setLocationModalOpen(true)}
                      disabled={loading}
                      className="w-full"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Location
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-category">
                    Category <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                    disabled={loading}
                    required
                  >
                    <SelectTrigger id="edit-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {JOB_CATEGORY_VALUES.map((categoryValue) => (
                        <SelectItem key={categoryValue} value={categoryValue}>
                          {categoryValue.charAt(0).toUpperCase() + categoryValue.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Hourly Rate and Vacancies */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-hourly_rate">
                    Hourly Rate (DKK) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-hourly_rate"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.hourly_rate}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || parseFloat(value) > 0) {
                        setFormData({ ...formData, hourly_rate: value });
                      }
                    }}
                    placeholder="150.00"
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-vacancies_total">
                    Vacancies <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-vacancies_total"
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
                  />
                </div>
              </div>

              {/* Break Duration */}
              <div className="space-y-2">
                <Label htmlFor="edit-break_minutes">Break Duration</Label>
                <Select
                  value={formData.break_minutes}
                  onValueChange={(value) => {
                    setFormData({ 
                      ...formData, 
                      break_minutes: value,
                      is_break_paid: value === '0' ? false : formData.is_break_paid
                    });
                  }}
                  disabled={loading}
                >
                  <SelectTrigger id="edit-break_minutes">
                    <SelectValue placeholder="Select break duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No break</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Break Payment Status */}
                {Number(formData.break_minutes) > 0 && (
                  <div className="mt-4 p-4 border rounded-md bg-gray-50 space-y-3">
                    <Label className="text-base font-semibold">
                      Is this break paid?
                    </Label>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center space-x-3 cursor-pointer p-2 rounded hover:bg-white border border-transparent hover:border-gray-200">
                        <input 
                          type="radio" 
                          name="edit_is_break_paid" 
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
                          name="edit_is_break_paid" 
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
                <Label htmlFor="edit-description">Description</Label>
                <textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Describe the role and responsibilities"
                  disabled={loading}
                />
              </div>

              {/* Must Bring */}
              <div className="space-y-2">
                <Label htmlFor="edit-must_bring">Must Bring</Label>
                <Input
                  id="edit-must_bring"
                  value={formData.must_bring}
                  onChange={(e) => setFormData({ ...formData, must_bring: e.target.value })}
                  placeholder="e.g., Black shoes, Work uniform"
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Items or equipment the worker must bring
                </p>
              </div>

              {/* Required Languages */}
              <div className="space-y-2 pt-2 border-t">
                <Label>Required Languages</Label>
                <div className="grid grid-cols-2 gap-3 p-4 border rounded-md bg-gray-50 max-h-48 overflow-y-auto">
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

              {/* Submit Buttons */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <CreateLocationModal
        open={locationModalOpen}
        onOpenChange={setLocationModalOpen}
        dict={{
          addTitle: 'Add New Location',
          addDescription: 'Create a new location for your company',
          nameLabel: 'Location Name',
          namePlaceholder: 'e.g., Downtown Office',
          addressLabel: 'Address',
          addressPlaceholder: 'Full address',
          save: 'Save Location',
          creating: 'Creating...',
          cancel: 'Cancel',
          nameRequired: 'Name is required',
          notLoggedIn: 'Not logged in',
          createError: 'Failed to create location',
        }}
        onSuccess={handleLocationCreated}
      />
    </>
  );
}
