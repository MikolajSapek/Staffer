'use client';

import { Card, CardContent } from '@/components/ui/card';

export default function MapPlaceholder() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-center h-64 bg-muted rounded-md">
          <p className="text-muted-foreground">
            Kort visning - Google Maps API key skal konfigureres
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

