'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, LayoutTemplate, Users, Archive } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

interface DashboardActionButtonsProps {
  pendingCount: number;
  lang: string;
  dict: {
    applicants: string;
    applicantsDesc: string;
    archiveShifts: string;
    locations: string;
    templates: string;
    managers?: string;
    managersDesc?: string;
    pending: string;
  };
}

export default function DashboardActionButtons({ 
  pendingCount, 
  lang,
  dict 
}: DashboardActionButtonsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Applicants - Full Width */}
      <Link href={`/${lang}/applicants`} className="md:col-span-3 block">
        <Card className={`
          transition-all hover:shadow-lg cursor-pointer h-full
          ${pendingCount > 0 ? 'border-primary border-2 hover:border-primary/70' : 'hover:border-primary/50'}
        `}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg font-semibold">
                {dict.applicants}
              </CardTitle>
            </div>
            {pendingCount > 0 && (
              <Badge variant="destructive" className="text-lg px-3 py-1">
                {pendingCount}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {dict.applicantsDesc}
            </p>
          </CardContent>
        </Card>
      </Link>

      {/* Archive Shifts - Full Width */}
      <Link href={`/${lang}/listings`} className="md:col-span-3 block">
        <Card className="transition-all hover:shadow-md hover:border-primary/50 cursor-pointer h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="flex items-center gap-3">
              <Archive className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base font-medium">
                {dict.archiveShifts}
              </CardTitle>
            </div>
          </CardHeader>
        </Card>
      </Link>

      {/* Locations - 50% Width */}
      <Link href={`/${lang}/locations`} className="block">
        <Card className="transition-all hover:shadow-md hover:border-primary/50 cursor-pointer h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {dict.locations}
            </CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-6">
              <MapPin className="h-6 w-6 text-primary/60" />
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Templates - 50% Width */}
      <Link href={`/${lang}/templates`} className="block">
        <Card className="transition-all hover:shadow-md hover:border-primary/50 cursor-pointer h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {dict.templates}
            </CardTitle>
            <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-6">
              <LayoutTemplate className="h-6 w-6 text-primary/60" />
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Managers - 50% Width */}
      <Link href={`/${lang}/managers`} className="block">
        <Card className="transition-all hover:shadow-md hover:border-primary/50 cursor-pointer h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {dict.managers || 'Managers'}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-6">
              <Users className="h-6 w-6 text-primary/60" />
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
