'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, MapPin, Briefcase, LayoutTemplate, Users } from 'lucide-react';
import Link from 'next/link';

interface StatsCardsProps {
  stats: {
    shifts: number;
    locations: number;
    hires: number;
    managers: number;
  };
  dict: {
    activeShifts: string;
    totalLocations: string;
    totalHires: string;
    clickToView: string;
    clickToManage: string;
  };
  lang: string;
}

export default function StatsCards({ stats, dict, lang }: StatsCardsProps) {
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {/* Card 1: Active Shifts - Clickable to go to Shifts page */}
      <Link href={`/${lang}/shifts`} className="block">
        <Card className="transition-all hover:shadow-md hover:border-primary/50 cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {dict.activeShifts}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.shifts}</div>
            <p className="text-xs text-muted-foreground mt-1">{dict.clickToView}</p>
          </CardContent>
        </Card>
      </Link>

      {/* Card 2: Total Locations - Clickable to go to Locations page */}
      <Link href={`/${lang}/locations`} className="block">
        <Card className="transition-all hover:shadow-md hover:border-primary/50 cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {dict.totalLocations}
            </CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.locations}</div>
            <p className="text-xs text-muted-foreground mt-1">{dict.clickToManage}</p>
          </CardContent>
        </Card>
      </Link>

      {/* Card 3: Total Hires - Clickable to go to Candidates page */}
      <Link href={`/${lang}/candidates`} className="block">
        <Card className="transition-all hover:shadow-md hover:border-primary/50 cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {dict.totalHires}
            </CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.hires}</div>
            <p className="text-xs text-muted-foreground mt-1">{dict.clickToView}</p>
          </CardContent>
        </Card>
      </Link>

      {/* Card 4: Templates - Navigate to Templates Library */}
      <Link href={`/${lang}/templates`} className="block">
        <Card className="transition-all hover:shadow-md hover:border-primary/50 cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Your Templates
            </CardTitle>
            <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-8">
              <LayoutTemplate className="h-8 w-8 text-primary/60" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Create and manage shift templates</p>
          </CardContent>
        </Card>
      </Link>

      {/* Card 5: Managers - Navigate to Managers page */}
      <Link href={`/${lang}/managers`} className="block">
        <Card className="transition-all hover:shadow-md hover:border-primary/50 cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Managers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.managers}</div>
            <p className="text-xs text-muted-foreground mt-1">{dict.clickToManage}</p>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}

