'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  User, 
  LogOut, 
  Calendar, 
  Briefcase, 
  DollarSign, 
  UserCircle, 
  LayoutDashboard, 
  Plus, 
  Users, 
  FileText 
} from 'lucide-react';

export default function Navbar() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<'worker' | 'company' | 'admin' | null>(null);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Fetch user and role
  useEffect(() => {
    const supabase = createClient();

    // Get initial user
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      // Handle AuthSessionMissingError gracefully - this is normal for logged out users
      if (error) {
        // Only log non-session-missing errors
        if (error.message && !error.message.includes('session') && !error.message.includes('JWT')) {
          console.warn('Navbar - Auth error:', error.message);
        }
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }

      setUser(user);
      if (user) {
        fetchUserRole(user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    async function fetchUserRole(userId: string) {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .maybeSingle();

        if (error) {
          // Handle RLS/permission errors gracefully
          if (error.code === '42501' || error.message?.includes('permission denied')) {
            // RLS policy issue - user might not have access yet
            console.warn('Navbar - Profile access denied (RLS):', error.message);
          } else {
            console.warn('Navbar Debug - Error fetching profile:', error.message);
          }
          setRole(null);
        } else if (profile && 'role' in profile) {
          const profileData = profile as { role: 'worker' | 'company' | 'admin' };
          console.log('Navbar Debug - Role found:', profileData.role);
          setRole(profileData.role);
        } else {
          console.log('Navbar Debug - No profile found (User needs onboarding)');
          setRole(null);
        }
      } catch (err: any) {
        // Handle AuthSessionMissingError and other errors gracefully
        if (err?.message?.includes('session') || err?.message?.includes('JWT')) {
          // Session error - user might be logged out
          setUser(null);
          setRole(null);
        } else {
          console.warn('Navbar Debug - Error in fetchUserRole:', err?.message || err);
        }
        setRole(null);
      } finally {
        setLoading(false);
      }
    }

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setIsOpen(false);
      setUser(null);
      setRole(null);
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getUserInitials = () => {
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const toggleDropdown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newState = !isOpen;
    console.log('Navbar Debug - toggleDropdown called, current isOpen:', isOpen, 'setting to:', newState);
    setIsOpen(newState);
  };

  if (loading) {
    return (
      <nav className="border-b bg-background">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-xl font-bold">
              Staffer
            </Link>
            <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
          </div>
        </div>
      </nav>
    );
  }

  console.log('Navbar Debug - Render state:', { user: user?.email || 'null', role, isOpen, loading });

  return (
    <nav className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            Staffer
          </Link>

          {!user ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link href="/login">Log ind</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Opret profil</Link>
              </Button>
            </div>
          ) : (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={toggleDropdown}
                className="rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary cursor-pointer"
                aria-label="User menu"
                type="button"
              >
                <Avatar>
                  <AvatarImage src={undefined} alt={user.email || 'User'} />
                  <AvatarFallback>{getUserInitials()}</AvatarFallback>
                </Avatar>
              </button>

              {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-[100]">
                  {/* SEKCJA 1: ZAWSZE WIDOCZNA - HEADER */}
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">{user?.email || 'User'}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {role ? `Rolle: ${role}` : 'Ingen rolle tildelt'}
                    </p>
                  </div>

                  {/* SEKCJA 2: OPCJE ZALEŻNE OD ROLI */}
                  {role === 'worker' && (
                    <>
                      <Link
                        href="/schedule"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        Min Kalender
                      </Link>
                      <Link
                        href="/applications"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <Briefcase className="mr-2 h-4 w-4" />
                        Ansøgninger
                      </Link>
                      <Link
                        href="/finances"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <DollarSign className="mr-2 h-4 w-4" />
                        Økonomi
                      </Link>
                    </>
                  )}

                  {role === 'company' && (
                    <>
                      <Link
                        href="/company/dashboard"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Dashboard
                      </Link>
                      <Link
                        href="/create-shift"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Opret vagt
                      </Link>
                      <Link
                        href="/candidates"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <Users className="mr-2 h-4 w-4" />
                        Kandidater
                      </Link>
                      <Link
                        href="/timesheets"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Tidsregistreringer
                      </Link>
                    </>
                  )}

                  {/* SEKCJA 3: ZAWSZE WIDOCZNA - STOPKA */}
                  <div className="border-t border-gray-100 mt-1">
                    <Link
                      href="/profile"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <UserCircle className="mr-2 h-4 w-4" />
                      Profil
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Log ud
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
