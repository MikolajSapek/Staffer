'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, CheckCircle2, Clock } from 'lucide-react';

interface PublicProfileViewProps {
  workerDetails: Record<string, unknown> | null;
  profile: { verification_status?: 'unverified' | 'pending' | 'verified' | 'rejected' } | null;
  dict: {
    profile: {
      title: string;
      subtitle: string;
      description: string;
      experience: string;
      preview: {
        fillFormToActivate: string;
        worker: string;
      };
    };
    Verification?: {
      status_verified?: string;
      status_pending?: string;
    };
  };
}

export default function PublicProfileView({
  workerDetails,
  profile,
  dict,
}: PublicProfileViewProps) {
  const displayName = [
    workerDetails?.first_name as string | undefined,
    workerDetails?.last_name as string | undefined,
  ].filter(Boolean).join(' ') || dict.profile.preview.worker;
  
  const avatarUrl = workerDetails?.avatar_url as string | undefined;
  const description = workerDetails?.description as string | undefined;
  const experience = workerDetails?.experience as string | undefined;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{dict.profile.title}</h1>
        <p className="text-muted-foreground">
          {dict.profile.subtitle}
        </p>
      </div>

      <Card className="shadow-lg">
        <CardContent className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="flex-shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-32 h-32 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-200 border-2 border-gray-200 flex items-center justify-center">
                  <User className="w-12 h-12 text-gray-400" />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-gray-900">{displayName}</h2>
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

              {description && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">{dict.profile.description}</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{description}</p>
                </div>
              )}

              {experience && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">{dict.profile.experience}</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{experience}</p>
                </div>
              )}

              {!description && !experience && (
                <p className="text-sm text-muted-foreground">
                  {dict.profile.preview.fillFormToActivate}
                </p>
              )}
            </div>
          </div>

          <Card className="bg-muted">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">
                Bank, tax and CPR details are hidden for privacy.
              </p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
