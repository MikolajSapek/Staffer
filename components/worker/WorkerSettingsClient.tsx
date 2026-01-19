'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { PasswordRequirements, validatePassword } from '@/components/ui/password-requirements';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

type TaxCardType = 'Hovedkort' | 'Bikort' | 'Frikort';

interface WorkerSettingsClientProps {
  dict: any;
  lang: string;
}

export default function WorkerSettingsClient({ dict, lang }: WorkerSettingsClientProps) {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Tax & Financial state
  const [taxCardType, setTaxCardType] = useState<TaxCardType>('Hovedkort');
  const [bankRegNumber, setBankRegNumber] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [cprNumber, setCprNumber] = useState('');

  // Notifications state
  const [notifyOnHired, setNotifyOnHired] = useState(true); // Always true and disabled
  const [notifyAdditionalMail, setNotifyAdditionalMail] = useState(true);
  const [notifyJobMatches, setNotifyJobMatches] = useState(false);
  const [notifyUrgentJobs, setNotifyUrgentJobs] = useState(false);
  const [notifyAllJobs, setNotifyAllJobs] = useState(false);
  const [newsletterSubscription, setNewsletterSubscription] = useState(false);

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Fetch user and settings data
  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient();
        
        const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !authUser) {
          setIsLoading(false);
          return;
        }

        setUser(authUser);

        // Fetch worker details using secure RPC
        const { data: workerData, error: workerError } = await supabase.rpc('get_worker_profile_secure');

        if (!workerError && workerData) {
          const data = workerData as Record<string, unknown>;
          
          // Set Tax & Financial data
          setTaxCardType((data.tax_card_type as TaxCardType) || 'Hovedkort');
          setBankRegNumber((data.bank_reg_number as string) || '');
          setBankAccountNumber((data.bank_account_number as string) || '');
          setCprNumber((data.cpr_number as string) || '');

          // Set Notifications data
          setNotifyOnHired(true); // Always true
          setNotifyAdditionalMail((data.notify_additional_mail as boolean) ?? true);
          setNotifyJobMatches((data.notify_job_matches as boolean) ?? false);
          setNotifyUrgentJobs((data.notify_urgent_jobs as boolean) ?? false);
          setNotifyAllJobs((data.notify_all_jobs as boolean) ?? false);
          setNewsletterSubscription((data.newsletter_subscription as boolean) ?? false);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // Save Tax & Financial settings
  const handleSaveTaxFinancial = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      if (!user) {
        setSubmitError(dict.profile?.authError || 'Not authenticated');
        setSubmitLoading(false);
        return;
      }

      const supabase = createClient();

      // Validate required fields
      if (!bankRegNumber.trim() || !bankAccountNumber.trim()) {
        setSubmitError(dict.profile?.validation?.bankRequired || 'Bank details are required');
        setSubmitLoading(false);
        return;
      }

      // Validate account number length (max 10 digits)
      if (bankAccountNumber.trim().length > 10) {
        setSubmitError('Account number cannot exceed 10 digits');
        setSubmitLoading(false);
        return;
      }

      // Update worker_details
      const { error: updateError } = await supabase
        .from('worker_details')
        .update({
          tax_card_type: taxCardType,
          bank_reg_number: bankRegNumber.trim(),
          bank_account_number: bankAccountNumber.trim(),
        })
        .eq('profile_id', user.id);

      if (updateError) {
        setSubmitError(updateError.message || 'Could not save financial settings');
        setSubmitLoading(false);
        return;
      }

      setSubmitSuccess(true);
      router.refresh();
    } catch (err) {
      console.error('Error saving financial settings:', err);
      setSubmitError('An unexpected error occurred');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Save Notifications settings
  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      if (!user) {
        setSubmitError(dict.profile?.authError || 'Not authenticated');
        setSubmitLoading(false);
        return;
      }

      const supabase = createClient();

      // Update worker_details
      const { error: updateError } = await supabase
        .from('worker_details')
        .update({
          notify_on_hired: notifyOnHired,
          notify_additional_mail: notifyAdditionalMail,
          notify_job_matches: notifyJobMatches,
          notify_urgent_jobs: notifyUrgentJobs,
          notify_all_jobs: notifyAllJobs,
          newsletter_subscription: newsletterSubscription,
        })
        .eq('profile_id', user.id);

      if (updateError) {
        setSubmitError(updateError.message || 'Could not save notification settings');
        setSubmitLoading(false);
        return;
      }

      setSubmitSuccess(true);
      router.refresh();
    } catch (err) {
      console.error('Error saving notification settings:', err);
      setSubmitError('An unexpected error occurred');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      // Validate all required fields
      if (!currentPassword || !newPassword || !confirmPassword) {
        setSubmitError(dict.settings?.passwordRequired || 'All password fields are required');
        setSubmitLoading(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        setSubmitError(dict.settings?.passwordMismatch || 'Passwords do not match');
        setSubmitLoading(false);
        return;
      }

      if (!validatePassword(newPassword)) {
        setSubmitError(dict.settings?.passwordTooWeak || 'Password must contain at least 8 characters, 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character');
        setSubmitLoading(false);
        return;
      }

      // Check if new password is different from current password
      if (currentPassword === newPassword) {
        setSubmitError(dict.settings?.passwordSameAsOld || 'New password must be different from current password');
        setSubmitLoading(false);
        return;
      }

      const supabase = createClient();

      // Verify current password by attempting to sign in
      if (!user?.email) {
        setSubmitError(dict.settings?.userEmailNotFound || 'User email not found');
        setSubmitLoading(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        setSubmitError(dict.settings?.incorrectCurrentPassword || 'Current password is incorrect');
        setSubmitLoading(false);
        return;
      }

      // Current password verified, now update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setSubmitError(updateError.message || 'Could not update password');
        setSubmitLoading(false);
        return;
      }

      setSubmitSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Error changing password:', err);
      setSubmitError('An unexpected error occurred');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center py-12">
          <p className="text-muted-foreground">{dict.profile?.loading || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-red-600 text-lg font-semibold mb-2">
              {dict.profile?.notLoggedIn || 'Not logged in'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{dict.settings?.title || 'Settings'}</h1>
        <p className="text-muted-foreground">
          {dict.settings?.subtitle || 'Manage your account settings and preferences'}
        </p>
      </div>

      <Tabs defaultValue="tax-financial" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tax-financial">
            {dict.settings?.tabTaxFinancial || 'Tax & Financial'}
          </TabsTrigger>
          <TabsTrigger value="notifications">
            {dict.settings?.tabNotifications || 'Notifications'}
          </TabsTrigger>
          <TabsTrigger value="affiliation">
            {dict.settings?.tabAffiliation || 'Affiliation'}
          </TabsTrigger>
          <TabsTrigger value="password">
            {dict.settings?.tabPassword || 'Password'}
          </TabsTrigger>
        </TabsList>

        {/* Tax & Financial Tab */}
        <TabsContent value="tax-financial">
          <Card>
            <CardHeader>
              <CardTitle>{dict.settings?.taxFinancialTitle || 'Tax & Financial Information'}</CardTitle>
              <CardDescription>
                {dict.settings?.taxFinancialDescription || 'Manage your tax card and bank details'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveTaxFinancial} className="space-y-6">
                {submitError && (
                  <div className="p-4 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
                    {submitError}
                  </div>
                )}
                {submitSuccess && (
                  <div className="p-4 text-sm text-green-600 bg-green-50 rounded-md border border-green-200">
                    {dict.settings?.settingsSaved || 'Settings saved successfully'}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="tax_card_type">{dict.profile?.taxCardType || 'Tax Card Type'} *</Label>
                  <select
                    id="tax_card_type"
                    value={taxCardType}
                    onChange={(e) => setTaxCardType(e.target.value as TaxCardType)}
                    required
                    disabled={submitLoading}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="Hovedkort">{dict.profile?.taxCardMain || 'Hovedkort'}</option>
                    <option value="Bikort">{dict.profile?.taxCardSecondary || 'Bikort'}</option>
                    <option value="Frikort">{dict.profile?.taxCardFree || 'Frikort'}</option>
                  </select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="bank_reg_number">
                      {dict.profile?.bankRegNumber || 'Bank Registration Number'} *
                    </Label>
                    <Input
                      id="bank_reg_number"
                      value={bankRegNumber}
                      onChange={(e) => setBankRegNumber(e.target.value)}
                      required
                      placeholder={dict.profile?.bankRegNumberPlaceholder || '1234'}
                      maxLength={4}
                      disabled={submitLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank_account_number">
                      {dict.profile?.bankAccountNumber || 'Bank Account Number'} *
                    </Label>
                    <Input
                      id="bank_account_number"
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value)}
                      required
                      placeholder={dict.profile?.bankAccountNumberPlaceholder || '1234567890'}
                      maxLength={10}
                      disabled={submitLoading}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button type="submit" disabled={submitLoading} size="lg">
                    {submitLoading
                      ? (dict.profile?.saving || 'Saving...')
                      : (dict.profile?.saveChanges || 'Save Changes')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>{dict.settings?.notificationsTitle || 'Notification Preferences'}</CardTitle>
              <CardDescription>
                {dict.settings?.notificationsDescription || 'Choose what notifications you want to receive'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveNotifications} className="space-y-6">
                {submitError && (
                  <div className="p-4 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
                    {submitError}
                  </div>
                )}
                {submitSuccess && (
                  <div className="p-4 text-sm text-green-600 bg-green-50 rounded-md border border-green-200">
                    {dict.settings?.settingsSaved || 'Settings saved successfully'}
                  </div>
                )}

                <div className="space-y-4">
                  {/* Notify on Hired - ALWAYS TRUE AND DISABLED */}
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                    <div className="flex-1">
                      <Label htmlFor="notify_on_hired" className="font-semibold cursor-not-allowed">
                        {dict.settings?.notifyOnHired || 'Notify me when I get a job'}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {dict.settings?.notifyOnHiredDesc || 'This notification is required and cannot be disabled'}
                      </p>
                    </div>
                    <Switch
                      id="notify_on_hired"
                      checked={notifyOnHired}
                      disabled={true}
                      className="opacity-60"
                    />
                  </div>

                  {/* Additional Mail */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <Label htmlFor="notify_additional_mail" className="font-semibold cursor-pointer">
                        {dict.settings?.notifyAdditionalMail || 'Additional Mail'}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {dict.settings?.notifyAdditionalMailDesc || 'Receive additional email notifications'}
                      </p>
                    </div>
                    <Switch
                      id="notify_additional_mail"
                      checked={notifyAdditionalMail}
                      onCheckedChange={setNotifyAdditionalMail}
                      disabled={submitLoading}
                    />
                  </div>

                  {/* Job Matches */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <Label htmlFor="notify_job_matches" className="font-semibold cursor-pointer">
                        {dict.settings?.notifyJobMatches || 'Notify me about jobs I match'}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {dict.settings?.notifyJobMatchesDesc || 'Get notified about jobs matching your skills'}
                      </p>
                    </div>
                    <Switch
                      id="notify_job_matches"
                      checked={notifyJobMatches}
                      onCheckedChange={setNotifyJobMatches}
                      disabled={submitLoading}
                    />
                  </div>

                  {/* Urgent Jobs */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <Label htmlFor="notify_urgent_jobs" className="font-semibold cursor-pointer">
                        {dict.settings?.notifyUrgentJobs || 'Notify me about urgent jobs'}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {dict.settings?.notifyUrgentJobsDesc || 'Get notified about urgent job opportunities'}
                      </p>
                    </div>
                    <Switch
                      id="notify_urgent_jobs"
                      checked={notifyUrgentJobs}
                      onCheckedChange={setNotifyUrgentJobs}
                      disabled={submitLoading}
                    />
                  </div>

                  {/* All Jobs */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <Label htmlFor="notify_all_jobs" className="font-semibold cursor-pointer">
                        {dict.settings?.notifyAllJobs || 'Notify me about all new job opportunities'}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {dict.settings?.notifyAllJobsDesc || 'Get notified about all new jobs'}
                      </p>
                    </div>
                    <Switch
                      id="notify_all_jobs"
                      checked={notifyAllJobs}
                      onCheckedChange={setNotifyAllJobs}
                      disabled={submitLoading}
                    />
                  </div>

                  {/* Newsletter */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <Label htmlFor="newsletter_subscription" className="font-semibold cursor-pointer">
                        {dict.settings?.newsletterSubscription || 'Receive newsletters'}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {dict.settings?.newsletterSubscriptionDesc || 'Subscribe to our newsletter'}
                      </p>
                    </div>
                    <Switch
                      id="newsletter_subscription"
                      checked={newsletterSubscription}
                      onCheckedChange={setNewsletterSubscription}
                      disabled={submitLoading}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button type="submit" disabled={submitLoading} size="lg">
                    {submitLoading
                      ? (dict.profile?.saving || 'Saving...')
                      : (dict.profile?.saveChanges || 'Save Changes')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Affiliation Agreement Tab */}
        <TabsContent value="affiliation">
          <Card>
            <CardHeader>
              <CardTitle>{dict.settings?.affiliationTitle || 'Affiliation Agreement'}</CardTitle>
              <CardDescription>
                {dict.settings?.affiliationDescription || 'Your affiliation agreement details'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-8 text-center border-2 border-dashed rounded-lg bg-muted/20">
                <p className="text-muted-foreground">
                  {dict.settings?.affiliationPlaceholder || 'Affiliation Agreement content coming soon...'}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Change Password Tab */}
        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>{dict.settings?.passwordTitle || 'Change Password'}</CardTitle>
              <CardDescription>
                {dict.settings?.passwordDescription || 'Update your account password'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-6">
                {submitError && (
                  <div className="p-4 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
                    {submitError}
                  </div>
                )}
                {submitSuccess && (
                  <div className="p-4 text-sm text-green-600 bg-green-50 rounded-md border border-green-200">
                    {dict.settings?.passwordChanged || 'Password changed successfully'}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="current_password">{dict.settings?.currentPassword || 'Current Password'} *</Label>
                  <PasswordInput
                    id="current_password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder={dict.settings?.currentPasswordPlaceholder || 'Enter current password'}
                    disabled={submitLoading}
                    autoComplete="current-password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new_password">{dict.settings?.newPassword || 'New Password'} *</Label>
                  <PasswordInput
                    id="new_password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder={dict.settings?.newPasswordPlaceholder || 'Enter new password'}
                    disabled={submitLoading}
                    autoComplete="new-password"
                  />
                  {newPassword && (
                    <PasswordRequirements password={newPassword} lang={lang} className="mt-3" />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm_password">
                    {dict.settings?.confirmPassword || 'Confirm New Password'} *
                  </Label>
                  <PasswordInput
                    id="confirm_password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder={dict.settings?.confirmPasswordPlaceholder || 'Confirm new password'}
                    disabled={submitLoading}
                    autoComplete="new-password"
                  />
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button type="submit" disabled={submitLoading} size="lg">
                    {submitLoading
                      ? (dict.settings?.changingPassword || 'Changing...')
                      : (dict.settings?.changePassword || 'Change Password')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
