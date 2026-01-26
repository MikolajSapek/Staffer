'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Upload, X } from 'lucide-react';

interface PersonalInfoSectionProps {
  formData: {
    first_name: string;
    last_name: string;
    phone_number: string;
    cpr_number: string;
  };
  workerDetails: Record<string, unknown> | null;
  avatarPreview: string;
  avatarFile: File | null;
  avatarInputRef: React.RefObject<HTMLInputElement>;
  submitLoading: boolean;
  dict: {
    profile: {
      personalInfo: string;
      personalInfoDescription: string;
      avatar: string;
      selectAvatar: string;
      avatarHint: string;
      firstName: string;
      firstNamePlaceholder: string;
      lastName: string;
      lastNamePlaceholder: string;
      phoneNumber: string;
      phoneNumberPlaceholder: string;
      cprNumber: string;
      cprNumberUpdate: string;
      cprNumberPlaceholder: string;
      cprNumberHint: string;
      cprNumberRequired: string;
    };
  };
  onFormDataChange: (data: Partial<PersonalInfoSectionProps['formData']>) => void;
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAvatarRemove: () => void;
}

export default function PersonalInfoSection({
  formData,
  workerDetails,
  avatarPreview,
  avatarFile,
  avatarInputRef,
  submitLoading,
  dict,
  onFormDataChange,
  onAvatarChange,
  onAvatarRemove,
}: PersonalInfoSectionProps) {
  return (
    <div className="space-y-4">
      <div className="border-b pb-2">
        <h3 className="text-lg font-semibold">{dict.profile.personalInfo}</h3>
        <p className="text-sm text-muted-foreground">{dict.profile.personalInfoDescription}</p>
      </div>

      {/* Avatar Upload */}
      <div className="space-y-2">
        <Label>{dict.profile.avatar} *</Label>
        <div className="flex items-center gap-4">
          {avatarPreview && (
            <div className="relative">
              <img
                src={avatarPreview}
                alt="Avatar preview"
                className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                onError={() => {
                  onAvatarRemove();
                }}
              />
              <button
                type="button"
                onClick={onAvatarRemove}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="flex-1">
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={onAvatarChange}
              disabled={submitLoading}
              className="hidden"
              id="avatar-upload"
            />
            <label
              htmlFor="avatar-upload"
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4" />
              {avatarFile ? avatarFile.name : dict.profile.selectAvatar}
            </label>
            <p className="text-xs text-muted-foreground mt-1">
              {dict.profile.avatarHint}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="first_name">{dict.profile.firstName} *</Label>
          <Input
            id="first_name"
            value={formData.first_name || ''}
            onChange={(e) => onFormDataChange({ first_name: e.target.value })}
            required
            placeholder={dict.profile.firstNamePlaceholder}
            disabled={submitLoading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">{dict.profile.lastName} *</Label>
          <Input
            id="last_name"
            value={formData.last_name || ''}
            onChange={(e) => onFormDataChange({ last_name: e.target.value })}
            required
            placeholder={dict.profile.lastNamePlaceholder}
            disabled={submitLoading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone_number">{dict.profile.phoneNumber} *</Label>
        <Input
          id="phone_number"
          type="tel"
          value={formData.phone_number || ''}
          onChange={(e) => onFormDataChange({ phone_number: e.target.value })}
          required
          placeholder={dict.profile.phoneNumberPlaceholder}
          disabled={submitLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cpr_number">
          {dict.profile.cprNumber} {!workerDetails?.cpr_number && '*'}
        </Label>
        <Input
          id="cpr_number"
          type="text"
          placeholder={workerDetails?.cpr_number ? dict.profile.cprNumberUpdate : dict.profile.cprNumberPlaceholder}
          value={formData.cpr_number || ''}
          onChange={(e) => {
            // Remove any non-digit characters immediately
            const value = e.target.value.replace(/\D/g, '');
            // Only update state if length is <= 10
            if (value.length <= 10) {
              onFormDataChange({ cpr_number: value });
            }
          }}
          required={!workerDetails?.cpr_number}
          maxLength={10}
          disabled={submitLoading}
        />
        <p className="text-xs text-muted-foreground">
          {workerDetails?.cpr_number 
            ? dict.profile.cprNumberHint
            : dict.profile.cprNumberRequired}
        </p>
      </div>
    </div>
  );
}
