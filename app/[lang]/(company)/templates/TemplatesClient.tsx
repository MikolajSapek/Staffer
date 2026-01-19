'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/utils/supabase/client';
import { FileText, Loader2, Trash2, Pencil, Plus } from 'lucide-react';
import { getTemplates, deleteTemplate } from '@/app/actions/templates';
import Link from 'next/link';

interface ShiftTemplateRequirement {
  id: string;
  template_id: string;
  skill_id: string;
  created_at: string;
  skills?: {
    id: string;
    name: string;
    category: string;
  };
}

interface Location {
  id: string;
  name: string;
  address: string;
}

interface ShiftTemplate {
  id: string;
  company_id: string;
  location_id: string | null;
  template_name: string;
  title: string;
  description: string | null;
  category: string;
  hourly_rate: number;
  vacancies_total: number;
  must_bring: string | null;
  break_minutes: number;
  is_break_paid: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  shift_template_requirements?: ShiftTemplateRequirement[];
  location?: Location;
}

interface TemplatesClientProps {
  dict: any;
  lang: string;
}

export default function TemplatesClient({ dict, lang }: TemplatesClientProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push(`/${lang}/login`);
        return;
      }

      // Fetch templates using the server action
      const templatesData = await getTemplates(user.id);

      // Fetch location details for templates with location_id
      const locationIds = templatesData
        .map((t) => t.location_id)
        .filter((id): id is string => id !== null);

      let locationsMap: Record<string, Location> = {};
      
      if (locationIds.length > 0) {
        const { data: locations } = await supabase
          .from('locations')
          .select('id, name, address')
          .in('id', locationIds);

        if (locations) {
          locationsMap = locations.reduce((acc, loc) => {
            acc[loc.id] = loc;
            return acc;
          }, {} as Record<string, Location>);
        }
      }

      // Map location data to templates
      const templatesWithLocations = templatesData.map((template) => ({
        ...template,
        location: template.location_id ? locationsMap[template.location_id] : undefined,
      }));

      setTemplates(templatesWithLocations);
    } catch (err: unknown) {
      console.error('Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (templateId: string, templateName: string) => {
    if (!confirm(`Are you sure you want to delete template "${templateName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(templateId);
      const result = await deleteTemplate(templateId);

      if (result.success) {
        // Refresh templates list
        await fetchTemplates();
      } else {
        alert(result.message || 'Failed to delete template');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error deleting template';
      alert(errorMessage);
    } finally {
      setDeleting(null);
    }
  };

  const handleEdit = (templateId: string) => {
    // TODO: Open EditTemplateDialog
    console.log('Edit template:', templateId);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading templates...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Shift Templates</h1>
          <p className="text-muted-foreground">
            Manage your saved shift templates for quick shift creation
          </p>
        </div>
        <Button asChild>
          <Link href={`/${lang}/templates/create`}>
            <Plus className="mr-2 h-4 w-4" />
            Create New Template
          </Link>
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              No templates found. Create your first template to speed up shift creation.
            </p>
            <Button asChild>
              <Link href={`/${lang}/templates/create`}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Template
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Your Templates ({templates.length})</CardTitle>
            <CardDescription>
              Click on a template to edit or delete it
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template Name</TableHead>
                    <TableHead>Role / Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Hourly Rate</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Vacancies</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          {template.template_name}
                        </div>
                      </TableCell>
                      <TableCell>{template.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{template.category}</Badge>
                      </TableCell>
                      <TableCell>
                        {template.hourly_rate} DKK/hr
                      </TableCell>
                      <TableCell>
                        {template.location ? (
                          <span className="text-sm">{template.location.name}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">No location</span>
                        )}
                      </TableCell>
                      <TableCell>{template.vacancies_total}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(template.id)}
                            title="Edit template"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(template.id, template.template_name)}
                            disabled={deleting === template.id}
                            className="text-destructive hover:text-destructive"
                            title="Delete template"
                          >
                            {deleting === template.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
