'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { PasswordRequirements, validatePassword } from '@/components/ui/password-requirements';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/utils/supabase/client';

interface SecuritySettingsProps {
  userEmail: string;
  lang: string;
}

export default function SecuritySettings({ userEmail, lang }: SecuritySettingsProps) {
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      // Validate all required fields
      if (!currentPassword || !newPassword || !confirmPassword) {
        setSubmitError('All password fields are required');
        setSubmitLoading(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        setSubmitError('New passwords do not match');
        setSubmitLoading(false);
        return;
      }

      if (!validatePassword(newPassword)) {
        setSubmitError('Password must contain at least 8 characters, 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character');
        setSubmitLoading(false);
        return;
      }

      // Check if new password is different from current password
      if (currentPassword === newPassword) {
        setSubmitError('New password must be different from current password');
        setSubmitLoading(false);
        return;
      }

      const supabase = createClient();

      // Verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      });

      if (signInError) {
        setSubmitError('Current password is incorrect');
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

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error changing password:', err);
      setSubmitError('An unexpected error occurred');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
        <CardDescription>
          Update your account password to keep your account secure
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
              Password changed successfully
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="current_password">Current Password *</Label>
            <PasswordInput
              id="current_password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              placeholder="Enter current password"
              disabled={submitLoading}
              autoComplete="current-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new_password">New Password *</Label>
            <PasswordInput
              id="new_password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              placeholder="Enter new password"
              disabled={submitLoading}
              autoComplete="new-password"
            />
            {newPassword && (
              <PasswordRequirements password={newPassword} lang={lang} className="mt-3" />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirm New Password *</Label>
            <PasswordInput
              id="confirm_password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm new password"
              disabled={submitLoading}
              autoComplete="new-password"
            />
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button type="submit" disabled={submitLoading} size="lg">
              {submitLoading ? 'Changing...' : 'Change Password'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
