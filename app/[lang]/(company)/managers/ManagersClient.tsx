'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Users, Loader2, Trash2, Pencil, Camera, X } from 'lucide-react';
import { getManagers, createManager, deleteManager, updateManager, type Manager } from '@/app/actions/managers';
import { useToast } from '@/components/ui/use-toast';
import ManagerCard from '@/components/team/ManagerCard';
import { createClient } from '@/utils/supabase/client';

interface ManagersClientProps {
  dict: {
    title: string;
    description: string;
    addManager: string;
    noManagers: string;
    loading: string;
    form: {
      editTitle: string;
      addTitle: string;
      addDescription: string;
      firstNameLabel: string;
      firstNamePlaceholder: string;
      lastNameLabel: string;
      lastNamePlaceholder: string;
      emailLabel: string;
      emailPlaceholder: string;
      phoneLabel: string;
      phonePlaceholder: string;
      save: string;
      creating: string;
      updating: string;
      cancel: string;
      deleting: string;
      deleteConfirm: string;
      deleteError: string;
      nameRequired: string;
      emailRequired: string;
      invalidEmail: string;
      createSuccess: string;
      updateSuccess: string;
      deleteSuccess: string;
      fetchError: string;
      avatarLabel?: string;
      selectAvatar?: string;
      avatarHint?: string;
    };
  };
  lang: string;
}

export default function ManagersClient({ dict, lang }: ManagersClientProps) {
  const { toast } = useToast();
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingManager, setEditingManager] = useState<Manager | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    avatar_url: '',
  });

  useEffect(() => {
    fetchManagers();
  }, []);

  const fetchManagers = async () => {
    try {
      setLoading(true);
      const data = await getManagers();
      setManagers(data || []);
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: dict.form.fetchError,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadAvatarToStorage = async (managerId: string): Promise<string | null> => {
    if (!avatarFile) return null;
    const supabase = createClient();
    const fileExt = avatarFile.name.split('.').pop() || 'jpg';
    const filePath = `managers/${managerId}/avatar-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, avatarFile, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);
    return publicUrl;
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setAvatarFile(file);
    }
  };

  const handleAvatarRemove = () => {
    setAvatarFile(null);
    setFormData((prev) => ({ ...prev, avatar_url: '' }));
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (!formData.first_name.trim() || !formData.last_name.trim()) {
        setError(dict.form.nameRequired);
        setSubmitting(false);
        return;
      }

      if (!formData.email.trim()) {
        setError(dict.form.emailRequired);
        setSubmitting(false);
        return;
      }

      let avatarUrl: string | null = formData.avatar_url?.trim() || null;
      let managerId: string | undefined;

      if (editingManager) {
        managerId = editingManager.id;
      } else {
        const createResult = await createManager({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone_number: formData.phone_number || null,
          avatar_url: avatarUrl,
        });
        if (!createResult.success) {
          setError(createResult.error || createResult.message);
          setSubmitting(false);
          return;
        }
        managerId = createResult.managerId ?? undefined;
      }

      if (avatarFile && managerId) {
        setIsUploading(true);
        try {
          const uploadedUrl = await uploadAvatarToStorage(managerId);
          if (uploadedUrl) avatarUrl = uploadedUrl;
        } catch (uploadErr) {
          setError(uploadErr instanceof Error ? uploadErr.message : 'Failed to upload photo');
          setSubmitting(false);
          setIsUploading(false);
          return;
        } finally {
          setIsUploading(false);
        }
      }

      if (editingManager) {
        const result = await updateManager(editingManager.id, {
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone_number: formData.phone_number || null,
          avatar_url: avatarUrl,
        });
        if (!result.success) {
          setError(result.error || result.message);
          setSubmitting(false);
          return;
        }
      } else if (avatarUrl && managerId) {
        await updateManager(managerId, { avatar_url: avatarUrl });
      }

      toast({
        title: 'Success',
        description: editingManager ? dict.form.updateSuccess : dict.form.createSuccess,
      });

      setFormData({ first_name: '', last_name: '', email: '', phone_number: '', avatar_url: '' });
      setAvatarFile(null);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
      setEditingManager(null);
      setDialogOpen(false);

      await fetchManagers();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : dict.form.fetchError;
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (manager: Manager) => {
    setEditingManager(manager);
    setFormData({
      first_name: manager.first_name,
      last_name: manager.last_name,
      email: manager.email,
      phone_number: manager.phone_number || '',
      avatar_url: manager.avatar_url || '',
    });
    setAvatarFile(null);
    if (avatarInputRef.current) avatarInputRef.current.value = '';
    setDialogOpen(true);
  };

  const handleDelete = async (managerId: string) => {
    if (!confirm(dict.form.deleteConfirm)) {
      return;
    }

    try {
      const result = await deleteManager(managerId);

      if (!result.success) {
        toast({
          title: 'Error',
          description: result.error || dict.form.deleteError,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: dict.form.deleteSuccess,
      });

      // Refresh managers list
      await fetchManagers();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : dict.form.deleteError;
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingManager(null);
      setFormData({ first_name: '', last_name: '', email: '', phone_number: '', avatar_url: '' });
      setAvatarFile(null);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
      setError(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">{dict.loading}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6 flex items-center justify-end">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {dict.addManager}
        </Button>
      </div>

      {managers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              {dict.noManagers}
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {dict.addManager}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Management Section - Manager Cards */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-4">{dict.title}</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {managers.map((manager) => (
                <div key={manager.id} className="relative group">
                  <ManagerCard
                    manager={{
                      name: `${manager.first_name} ${manager.last_name}`,
                      email: manager.email,
                      phone: manager.phone_number,
                      avatarUrl: manager.avatar_url ?? null,
                      department: 'Management',
                      isVerified: false,
                    }}
                  />
                  <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 shadow-sm"
                      onClick={() => handleEdit(manager)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8 shadow-sm"
                      onClick={() => handleDelete(manager.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* Single Dialog for both Add and Edit */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingManager ? dict.form.editTitle : dict.form.addTitle}</DialogTitle>
              <DialogDescription>
                {dict.form.addDescription}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
                  {error}
                </div>
              )}
              <div className="space-y-4 py-4">
                {/* Avatar Upload */}
                <div className="space-y-2">
                  <Label>{dict.form.avatarLabel ?? 'Profile photo'}</Label>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="w-24 h-24 border-2 border-gray-200">
                        {isUploading ? (
                          <div className="flex h-full w-full items-center justify-center bg-muted">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                          </div>
                        ) : avatarFile ? (
                          <img
                            src={URL.createObjectURL(avatarFile)}
                            alt="Preview"
                            className="aspect-square h-full w-full object-cover"
                          />
                        ) : (
                          <>
                            <AvatarImage src={formData.avatar_url || undefined} alt="Avatar" />
                            <AvatarFallback className="text-2xl bg-muted text-muted-foreground">
                              {formData.first_name && formData.last_name
                                ? `${formData.first_name[0]}${formData.last_name[0]}`.toUpperCase()
                                : '?'}
                            </AvatarFallback>
                          </>
                        )}
                      </Avatar>
                      {(avatarFile || formData.avatar_url) && !isUploading && (
                        <button
                          type="button"
                          onClick={handleAvatarRemove}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        disabled={submitting || isUploading}
                        className="hidden"
                        id="manager-avatar-upload"
                      />
                      <label
                        htmlFor="manager-avatar-upload"
                        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Camera className="w-4 h-4" />
                        {avatarFile ? avatarFile.name : (dict.form.selectAvatar ?? 'Select photo')}
                      </label>
                      <p className="text-xs text-muted-foreground mt-1">
                        {dict.form.avatarHint ?? 'JPG, PNG or GIF. Max 10MB.'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="first_name">
                    {dict.form.firstNameLabel} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder={dict.form.firstNamePlaceholder}
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">
                    {dict.form.lastNameLabel} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder={dict.form.lastNamePlaceholder}
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">
                    {dict.form.emailLabel} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder={dict.form.emailPlaceholder}
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone_number">
                    {dict.form.phoneLabel}
                  </Label>
                  <Input
                    id="phone_number"
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    placeholder={dict.form.phonePlaceholder}
                    disabled={submitting}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDialogOpenChange(false)}
                  disabled={submitting || isUploading}
                >
                  {dict.form.cancel}
                </Button>
                <Button type="submit" disabled={submitting || isUploading}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {editingManager ? dict.form.updating : dict.form.creating}
                    </>
                  ) : (
                    dict.form.save
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
    </div>
  );
}
