'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

interface NotificationPreferences {
  channels: {
    email: boolean;
    sms: boolean;
  };
  types: {
    newsletter: boolean;
    new_worker_applied: boolean;
    offer_accepted: boolean;
    pending_workdays: boolean;
    pick_candidates: boolean;
    rate_worker: boolean;
  };
}

const defaultPreferences: NotificationPreferences = {
  channels: {
    email: true,
    sms: false,
  },
  types: {
    newsletter: false,
    new_worker_applied: true,
    offer_accepted: true,
    pending_workdays: true,
    pick_candidates: true,
    rate_worker: true,
  },
};

interface NotificationSettingsProps {
  userId: string;
}

export default function NotificationSettings({ userId }: NotificationSettingsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);

  // Fetch notification settings
  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient();
        
        const { data: companyData, error } = await supabase
          .from('company_details')
          .select('notification_settings')
          .eq('profile_id', userId)
          .maybeSingle();

        if (!error && companyData?.notification_settings) {
          // Merge fetched settings with defaults to handle missing keys
          setPreferences({
            channels: {
              ...defaultPreferences.channels,
              ...(companyData.notification_settings as any)?.channels,
            },
            types: {
              ...defaultPreferences.types,
              ...(companyData.notification_settings as any)?.types,
            },
          });
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching notification settings:', err);
        setIsLoading(false);
      }
    }

    fetchData();
  }, [userId]);

  const handleChannelChange = (channel: keyof NotificationPreferences['channels'], checked: boolean) => {
    setPreferences(prev => ({
      ...prev,
      channels: {
        ...prev.channels,
        [channel]: checked,
      },
    }));
  };

  const handleTypeChange = (type: keyof NotificationPreferences['types'], checked: boolean) => {
    setPreferences(prev => ({
      ...prev,
      types: {
        ...prev.types,
        [type]: checked,
      },
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const supabase = createClient();

      // Update notification_settings JSONB column
      const { error: updateError } = await supabase
        .from('company_details')
        .update({
          notification_settings: preferences,
        })
        .eq('profile_id', userId);

      if (updateError) {
        setSubmitError(updateError.message || 'Could not save notification settings');
        setSubmitLoading(false);
        return;
      }

      setSubmitSuccess(true);
      router.refresh();

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error saving notification settings:', err);
      setSubmitError('An unexpected error occurred');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>
          Choose how and when you want to receive notifications
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-6">
          {submitError && (
            <div className="p-4 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
              {submitError}
            </div>
          )}
          {submitSuccess && (
            <div className="p-4 text-sm text-green-600 bg-green-50 rounded-md border border-green-200">
              Notification settings saved successfully
            </div>
          )}

          {/* Channels Section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-1">Notification Channels</h3>
              <p className="text-xs text-muted-foreground">Choose how you want to receive notifications</p>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <Label htmlFor="channel_email" className="font-semibold cursor-pointer">
                  Email Notifications
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Receive notifications via email
                </p>
              </div>
              <Switch
                id="channel_email"
                checked={preferences.channels.email}
                onCheckedChange={(checked) => handleChannelChange('email', checked)}
                disabled={submitLoading}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <Label htmlFor="channel_sms" className="font-semibold cursor-pointer">
                  SMS Notifications
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Receive notifications via SMS
                </p>
              </div>
              <Switch
                id="channel_sms"
                checked={preferences.channels.sms}
                onCheckedChange={(checked) => handleChannelChange('sms', checked)}
                disabled={submitLoading}
              />
            </div>
          </div>

          <div className="border-t my-6" />

          {/* Notification Types Section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-1">Notification Types</h3>
              <p className="text-xs text-muted-foreground">Choose which events you want to be notified about</p>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <Label htmlFor="type_newsletter" className="font-semibold cursor-pointer">
                  Newsletter
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Receive our newsletter with updates and tips
                </p>
              </div>
              <Switch
                id="type_newsletter"
                checked={preferences.types.newsletter}
                onCheckedChange={(checked) => handleTypeChange('newsletter', checked)}
                disabled={submitLoading}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <Label htmlFor="type_new_worker" className="font-semibold cursor-pointer">
                  New Worker Applied
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Get notified when a worker applies for your shift
                </p>
              </div>
              <Switch
                id="type_new_worker"
                checked={preferences.types.new_worker_applied}
                onCheckedChange={(checked) => handleTypeChange('new_worker_applied', checked)}
                disabled={submitLoading}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <Label htmlFor="type_offer_accepted" className="font-semibold cursor-pointer">
                  Offer Accepted by Worker
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Get notified when a worker accepts your offer
                </p>
              </div>
              <Switch
                id="type_offer_accepted"
                checked={preferences.types.offer_accepted}
                onCheckedChange={(checked) => handleTypeChange('offer_accepted', checked)}
                disabled={submitLoading}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <Label htmlFor="type_pending_workdays" className="font-semibold cursor-pointer">
                  Pending Workdays to Approve
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Reminders for pending timesheet approvals
                </p>
              </div>
              <Switch
                id="type_pending_workdays"
                checked={preferences.types.pending_workdays}
                onCheckedChange={(checked) => handleTypeChange('pending_workdays', checked)}
                disabled={submitLoading}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <Label htmlFor="type_pick_candidates" className="font-semibold cursor-pointer">
                  Pick Candidates
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Reminders to review and select candidates for shifts
                </p>
              </div>
              <Switch
                id="type_pick_candidates"
                checked={preferences.types.pick_candidates}
                onCheckedChange={(checked) => handleTypeChange('pick_candidates', checked)}
                disabled={submitLoading}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <Label htmlFor="type_rate_worker" className="font-semibold cursor-pointer">
                  Rate Worker
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Reminders to rate workers after shift completion
                </p>
              </div>
              <Switch
                id="type_rate_worker"
                checked={preferences.types.rate_worker}
                onCheckedChange={(checked) => handleTypeChange('rate_worker', checked)}
                disabled={submitLoading}
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button type="submit" disabled={submitLoading} size="lg">
              {submitLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
