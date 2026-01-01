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
import { createClient } from '@/utils/supabase/client';
import { Plus, MapPin, Loader2, Trash2 } from 'lucide-react';

interface Location {
  id: string;
  name: string;
  address: string;
  created_at: string;
}

interface LocationsClientProps {
  dict: {
    title: string;
    description: string;
    addLocation: string;
    noLocations: string;
    loading: string;
    form: {
      editTitle: string;
      addTitle: string;
      addDescription: string;
      nameLabel: string;
      namePlaceholder: string;
      addressLabel: string;
      addressPlaceholder: string;
      save: string;
      creating: string;
      cancel: string;
      deleting: string;
      deleteConfirm: string;
      deleteError: string;
      nameRequired: string;
      notLoggedIn: string;
      createError: string;
      fetchError: string;
    };
  };
  lang: string;
}

export default function LocationsClient({ dict, lang }: LocationsClientProps) {
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
  });

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push(`/${lang}/login`);
        return;
      }

      const { data, error } = await supabase
        .from('locations')
        .select('id, name, address, created_at')
        .eq('company_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setLocations(data || []);
    } catch (err: any) {
      console.error('Error fetching locations details:', JSON.stringify(err, null, 2));
      setError(dict.form.fetchError);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (!formData.name.trim() || !formData.address.trim()) {
        setError(dict.form.nameRequired);
        setSubmitting(false);
        return;
      }

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError(dict.form.notLoggedIn);
        setSubmitting(false);
        return;
      }

      const { error: insertError } = await supabase
        .from('locations')
        .insert({
          company_id: user.id,
          name: formData.name.trim(),
          address: formData.address.trim(),
        });

      if (insertError) {
        throw insertError;
      }

      // Reset form and close dialog
      setFormData({ name: '', address: '' });
      setDialogOpen(false);
      
      // Refresh locations list
      await fetchLocations();
    } catch (err: any) {
      console.error('Error creating location:', err);
      setError(err.message || dict.form.createError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (locationId: string) => {
    if (!confirm(dict.form.deleteConfirm)) {
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', locationId);

      if (error) throw error;

      // Refresh locations list
      await fetchLocations();
    } catch (err: any) {
      console.error('Error deleting location:', err);
      alert(err.message || dict.form.deleteError);
    }
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
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {dict.addLocation}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{dict.form.addTitle}</DialogTitle>
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
                  <Label htmlFor="name">
                    {dict.form.nameLabel} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={dict.form.namePlaceholder}
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">
                    {dict.form.addressLabel} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder={dict.form.addressPlaceholder}
                    required
                    disabled={submitting}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    setFormData({ name: '', address: '' });
                    setError(null);
                  }}
                  disabled={submitting}
                >
                  {dict.form.cancel}
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {dict.form.creating}
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

      {locations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              {dict.noLocations}
            </p>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  {dict.addLocation}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{dict.form.addTitle}</DialogTitle>
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
                      <Label htmlFor="name-empty">
                        {dict.form.nameLabel} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="name-empty"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder={dict.form.namePlaceholder}
                        required
                        disabled={submitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address-empty">
                        {dict.form.addressLabel} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="address-empty"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder={dict.form.addressPlaceholder}
                        required
                        disabled={submitting}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDialogOpen(false);
                        setFormData({ name: '', address: '' });
                        setError(null);
                      }}
                      disabled={submitting}
                    >
                      {dict.form.cancel}
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {dict.form.creating}
                        </>
                      ) : (
                        dict.form.save
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {locations.map((location) => (
            <Card key={location.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{location.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {location.address}
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(location.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

