'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface AdditionalInfoSectionProps {
  formData: {
    shirt_size: string;
    shoe_size: string;
  };
  submitLoading: boolean;
  dict: {
    profile: {
      additionalInfo: string;
      additionalInfoDescription: string;
      shirtSize: string;
      shirtSizePlaceholder: string;
      shoeSize: string;
      shoeSizePlaceholder: string;
    };
  };
  onFormDataChange: (data: Partial<AdditionalInfoSectionProps['formData']>) => void;
}

export default function AdditionalInfoSection({
  formData,
  submitLoading,
  dict,
  onFormDataChange,
}: AdditionalInfoSectionProps) {
  return (
    <div className="space-y-4">
      <div className="border-b pb-2">
        <h3 className="text-lg font-semibold">{dict.profile.additionalInfo}</h3>
        <p className="text-sm text-muted-foreground">{dict.profile.additionalInfoDescription}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="shirt_size">{dict.profile.shirtSize}</Label>
          <Input
            id="shirt_size"
            value={formData.shirt_size || ''}
            onChange={(e) => onFormDataChange({ shirt_size: e.target.value })}
            placeholder={dict.profile.shirtSizePlaceholder}
            disabled={submitLoading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shoe_size">{dict.profile.shoeSize}</Label>
          <Input
            id="shoe_size"
            value={formData.shoe_size || ''}
            onChange={(e) => onFormDataChange({ shoe_size: e.target.value })}
            placeholder={dict.profile.shoeSizePlaceholder}
            disabled={submitLoading}
          />
        </div>
      </div>
    </div>
  );
}
