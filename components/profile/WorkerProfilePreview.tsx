'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, CheckCircle2, Clock } from 'lucide-react';

interface WorkerProfilePreviewProps {
  formData: {
    first_name: string;
    last_name: string;
    phone_number: string;
    cpr_number: string;
  };
  workerDetails: Record<string, unknown> | null;
  user: { id: string; email?: string } | null;
  avatarPreview: string;
  avatarError: boolean;
  profile: { verification_status?: 'unverified' | 'pending' | 'verified' | 'rejected' } | null;
  isProfileComplete: boolean;
  dict: {
    profile: {
      preview: {
        workerIdCard: string;
        worker: string;
        firstName: string;
        lastName: string;
        profileComplete: string;
        fillFormToActivate: string;
      };
      phoneNumber: string;
    };
    Verification?: {
      status_verified?: string;
      status_pending?: string;
    };
  };
  onAvatarError: () => void;
}

export default function WorkerProfilePreview({
  formData,
  workerDetails,
  user,
  avatarPreview,
  avatarError,
  profile,
  isProfileComplete,
  dict,
  onAvatarError,
}: WorkerProfilePreviewProps) {
  // Helper function to mask CPR (Privacy Mode: show first 6 digits, mask last 4)
  const maskCPR = (cpr: string) => {
    if (!cpr) return '******-****';
    // Remove any existing dashes for processing
    const cleanCPR = cpr.replace(/-/g, '');
    if (cleanCPR.length < 10) return '******-****';
    // Get first 6 digits (birth date)
    const first6 = cleanCPR.slice(0, 6);
    // Mask last 4 digits
    return `${first6}-****`;
  };

  return (
    <div className="lg:col-span-1">
      <div className="sticky top-6">
        <Card className="shadow-lg border-2 border-gray-200">
          <CardContent className="p-6">
            {/* Worker ID Card Preview */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
              {/* Header */}
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Staffer
                </h3>
                <p className="text-xs text-gray-500">{dict.profile.preview.workerIdCard}</p>
              </div>

              {/* Avatar */}
              <div className="flex justify-center mb-6">
                {avatarPreview && !avatarError ? (
                  <img
                    src={avatarPreview}
                    alt="Profile"
                    className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                    onError={onAvatarError}
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gray-200 border-4 border-white shadow-lg flex items-center justify-center">
                    <User className="w-16 h-16 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Name */}
              <div className="text-center mb-4">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {formData.first_name && formData.last_name
                      ? `${formData.first_name} ${formData.last_name}`
                      : formData.first_name
                      ? formData.first_name
                      : formData.last_name
                      ? formData.last_name
                      : `${dict.profile.firstName} ${dict.profile.lastName}`}
                  </h2>
                  {/* Verification Status Badge */}
                  {profile?.verification_status === 'verified' && (
                    <Badge className="bg-green-600 hover:bg-green-700 gap-1 text-white">
                      <CheckCircle2 className="h-3 w-3" />
                      <span className="text-xs">{dict.Verification?.status_verified || 'Account Verified'}</span>
                    </Badge>
                  )}
                  {profile?.verification_status === 'pending' && (
                    <Badge variant="outline" className="text-orange-600 border-orange-600 gap-1">
                      <Clock className="h-3 w-3" />
                      <span className="text-xs">{dict.Verification?.status_pending || 'Verification Pending'}</span>
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">{dict.profile.preview.worker}</p>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-300 my-4"></div>

              {/* Details */}
              <div className="space-y-3">
                {/* CPR (Masked) */}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                    CPR
                  </p>
                  <p className="text-sm font-mono font-semibold text-gray-900">
                    {formData.cpr_number || workerDetails?.cpr_number
                      ? maskCPR(formData.cpr_number || (workerDetails?.cpr_number as string) || '')
                      : '******-****'}
                  </p>
                </div>

                {/* Phone */}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                    {dict.profile.phoneNumber}
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formData.phone_number || `${dict.profile.phoneNumber}...`}
                  </p>
                </div>

                {/* Email */}
                {user && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                      Email
                    </p>
                    <p className="text-sm font-semibold text-gray-900 break-all">
                      {user.email || 'Email...'}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-gray-300">
                <p className="text-xs text-center text-gray-500">
                  {isProfileComplete 
                    ? dict.profile.preview.profileComplete
                    : dict.profile.preview.fillFormToActivate}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
