'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus, Users, Loader2, Trash2, Mail, Phone, Pencil } from 'lucide-react';
import { getManagers, createManager, deleteManager, updateManager, type Manager } from '@/app/actions/managers';
import { useToast } from '@/components/ui/use-toast';

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
    };
  };
  lang: string;
}

export default function ManagersClient({ dict, lang }: ManagersClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingManager, setEditingManager] = useState<Manager | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
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

      let result;
      if (editingManager) {
        result = await updateManager(editingManager.id, {
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone_number: formData.phone_number || null,
        });
      } else {
        result = await createManager({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone_number: formData.phone_number || null,
        });
      }

      if (!result.success) {
        setError(result.error || result.message);
        setSubmitting(false);
        return;
      }

      toast({
        title: 'Success',
        description: editingManager ? dict.form.updateSuccess : dict.form.createSuccess,
      });

      // Reset form and close dialog
      setFormData({ first_name: '', last_name: '', email: '', phone_number: '' });
      setEditingManager(null);
      setDialogOpen(false);
      
      // Refresh managers list
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
    });
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
      setFormData({ first_name: '', last_name: '', email: '', phone_number: '' });
      setError(null);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">{dict.title}</h1>
          <p className="text-muted-foreground">
            {dict.description}
          </p>
        </div>
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {managers.map((manager) => (
            <Card key={manager.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {getInitials(manager.first_name, manager.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {manager.first_name} {manager.last_name}
                      </CardTitle>
                      <CardDescription className="mt-1 space-y-1">
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{manager.email}</span>
                        </div>
                        {manager.phone_number && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3" />
                            <span>{manager.phone_number}</span>
                          </div>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(manager)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(manager.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
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
                  disabled={submitting}
                >
                  {dict.form.cancel}
                </Button>
                <Button type="submit" disabled={submitting}>
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
