'use client';

import { Label } from '@/components/ui/label';

interface BioExperienceSectionProps {
  formData: {
    description: string;
    experience: string;
  };
  submitLoading: boolean;
  dict: {
    profile: {
      bioAndExperience: string;
      bioAndExperienceDescription: string;
      description: string;
      descriptionPlaceholder: string;
      experience: string;
      experiencePlaceholder: string;
    };
  };
  onFormDataChange: (data: Partial<BioExperienceSectionProps['formData']>) => void;
}

export default function BioExperienceSection({
  formData,
  submitLoading,
  dict,
  onFormDataChange,
}: BioExperienceSectionProps) {
  return (
    <div className="space-y-4">
      <div className="border-b pb-2">
        <h3 className="text-lg font-semibold">{dict.profile.bioAndExperience}</h3>
        <p className="text-sm text-muted-foreground">{dict.profile.bioAndExperienceDescription}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{dict.profile.description} *</Label>
        <textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => onFormDataChange({ description: e.target.value })}
          placeholder={dict.profile.descriptionPlaceholder}
          rows={4}
          required
          disabled={submitLoading}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="experience">{dict.profile.experience} *</Label>
        <textarea
          id="experience"
          value={formData.experience || ''}
          onChange={(e) => onFormDataChange({ experience: e.target.value })}
          placeholder={dict.profile.experiencePlaceholder}
          rows={6}
          required
          disabled={submitLoading}
          className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
    </div>
  );
}
