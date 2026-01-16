'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CorrectionBadgeProps {
  metadata: {
    hours_original?: number;
    hours_final?: number;
    note?: string;
    resolution_type?: string;
  } | null;
  was_disputed?: boolean;
}

export function CorrectionBadge({ metadata, was_disputed }: CorrectionBadgeProps) {
  const hoursOriginal = metadata?.hours_original;
  const hoursFinal = metadata?.hours_final;
  const note = metadata?.note || null;
  const hasHoursChange = 
    hoursOriginal !== undefined && 
    hoursFinal !== undefined && 
    hoursOriginal !== hoursFinal;
  const hasDispute = metadata?.resolution_type === 'dispute_approved' || was_disputed;

  // If no correction or dispute, don't show anything
  if (!hasHoursChange && !hasDispute) {
    return null;
  }

  // Format hours with 2 decimal places
  const formatHours = (hours: number) => {
    return hours.toFixed(2);
  };

  // If hours changed, show the correction
  if (hasHoursChange) {
    const tooltipContent = note || `Hours corrected from ${formatHours(hoursOriginal)} to ${formatHours(hoursFinal)}`;
    
    return (
      <Tooltip content={tooltipContent}>
        <Badge
          variant="outline"
          className="bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200 cursor-help"
        >
          <span className="line-through text-gray-400 mr-1">
            {formatHours(hoursOriginal)}h
          </span>
          <ArrowRight className="h-3 w-3 mx-0.5" />
          <span className="ml-1">
            {formatHours(hoursFinal)}h
          </span>
        </Badge>
      </Tooltip>
    );
  }

  // If no hours change but there was a dispute
  if (hasDispute) {
    const tooltipContent = note || 'Dispute resolved. Hours corrected after dispute.';
    
    return (
      <Tooltip content={tooltipContent}>
        <Badge
          className="bg-amber-500 hover:bg-amber-600 text-white border-amber-600 cursor-help"
          variant="default"
        >
          <AlertTriangle className="h-3 w-3 mr-1" />
          Dispute Resolved
        </Badge>
      </Tooltip>
    );
  }

  return null;
}
