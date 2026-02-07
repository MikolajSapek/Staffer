'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export interface ManagerCardProps {
  manager: {
    name: string;
    email: string;
    phone?: string | null;
    avatarUrl?: string | null;
    department?: string | null;
    isVerified?: boolean;
  };
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';
}

export default function ManagerCard({ manager }: ManagerCardProps) {
  return (
    <Card className="w-full max-w-md mx-auto overflow-hidden bg-white border border-gray-100 shadow-md rounded-xl">
      <div className="p-6 flex flex-col items-center text-center bg-blue-50/10">
        <div className="w-full text-left mb-4">
          <h3 className="text-xs font-bold text-gray-400 tracking-wider uppercase">STAFFER</h3>
          <p className="text-sm text-gray-500">Manager Card</p>
        </div>

        <Avatar className="w-32 h-32 border-4 border-white shadow-sm mb-4">
          <AvatarImage src={manager.avatarUrl ?? undefined} alt={manager.name} />
          <AvatarFallback className="text-2xl bg-muted text-muted-foreground">
            {getInitials(manager.name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex items-center justify-center gap-2 mb-1 flex-wrap">
          <h2 className="text-2xl font-bold text-gray-900">{manager.name}</h2>
          {manager.isVerified && (
            <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-3">
              Verified
            </Badge>
          )}
        </div>
        <p className="text-gray-500 font-medium mb-6">Manager</p>
      </div>

      <div className="border-t border-gray-100" />

      <div className="p-6 space-y-4 text-left">
        <div>
          <p className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-1">
            PHONE NUMBER
          </p>
          <p className="font-semibold text-gray-900">
            {manager.phone || 'Not provided'}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-1">EMAIL</p>
          <p className="font-semibold text-gray-900 break-all">{manager.email}</p>
        </div>
        <div>
          <p className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-1">DEPARTMENT</p>
          <p className="font-semibold text-gray-900">
            {manager.department || 'Management'}
          </p>
        </div>
      </div>
    </Card>
  );
}
