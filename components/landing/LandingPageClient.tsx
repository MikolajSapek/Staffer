'use client';

import { useState, useEffect } from 'react';
import {
  Briefcase,
  Building2,
  Phone,
  MessageCircle,
  Mail,
  UtensilsCrossed,
  Package,
  PartyPopper,
  Building,
  Apple,
  Play,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import JobBoardClient from '@/app/[lang]/JobBoardClient';
import type { User } from '@supabase/supabase-js';

interface Shift {
  id: string;
  title: string;
  description: string | null;
  category: string;
  hourly_rate: number;
  start_time: string;
  end_time: string;
  break_minutes: number;
  is_break_paid: boolean;
  vacancies_total: number;
  vacancies_taken: number;
  status: string;
  company_id: string;
  is_urgent: boolean;
  possible_overtime: boolean;
  must_bring: string | null;
  locations: { name: string; address: string } | null;
  company?: { company_name?: string; logo_url?: string | null };
  profiles?: {
    company_details?: {
      company_name?: string;
      logo_url?: string | null;
    } | null;
  } | null;
}

interface LandingPageClientProps {
  shifts: Shift[];
  userRole: 'worker' | 'company' | 'admin' | null;
  user: User | null;
  appliedShiftIds: string[];
  applicationStatusMap: Record<string, string>;
  applicationIdMap?: Record<string, string>;
  verificationStatus: string | null;
  dict: Record<string, unknown>;
  lang: string;
}

const INDUSTRIES = [
  { icon: UtensilsCrossed, titleKey: 'industryCanteen', rolesKey: 'industryCanteenRoles' },
  { icon: Package, titleKey: 'industryWarehouse', rolesKey: 'industryWarehouseRoles' },
  { icon: PartyPopper, titleKey: 'industryEvents', rolesKey: 'industryEventsRoles' },
  { icon: Building, titleKey: 'industryOffice', rolesKey: 'industryOfficeRoles' },
];

export default function LandingPageClient({
  shifts,
  userRole,
  user,
  appliedShiftIds,
  applicationStatusMap,
  applicationIdMap = {},
  verificationStatus,
  dict,
  lang,
}: LandingPageClientProps) {
  const landing = (dict?.landing as Record<string, string>) ?? {};
  const nav = (dict?.navigation as Record<string, string>) ?? {};
  const jobBoard = (dict?.jobBoard as Record<string, string>) ?? {};

  const [activeTab, setActiveTab] = useState<'job-seekers' | 'companies' | 'contact'>('job-seekers');
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', iam: '', comment: '' });

  const hashToTab = (hash: string): 'job-seekers' | 'companies' | 'contact' => {
    const value = hash.replace(/^#/, '');
    if (value === 'companies' || value === 'job-seekers' || value === 'contact') return value;
    return 'job-seekers';
  };

  useEffect(() => {
    const handleHashChange = () => setActiveTab(hashToTab(window.location.hash));
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleTabChange = (value: 'job-seekers' | 'companies' | 'contact') => {
    setActiveTab(value);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${value}`);
    }
  };

  const t = (key: string, fallback: string) => landing[key] ?? fallback;

  return (
    <div className="min-h-screen bg-white font-sans" style={{ fontFamily: 'sans-serif' }}>
      {/* SECTION A: HERO */}
      <section className="container mx-auto px-4 py-12 md:py-20">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-16">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-black md:text-4xl lg:text-5xl">
              {t('heroTitle', 'Connecting hourly workers and employers - Find your perfect match with Staffer!')}
            </h1>
            <p className="mt-6 text-lg text-gray-600">
              {t('heroSubtext', 'Are you an employer looking for the right talent? Or a job seeker looking for flexible shifts? Staffer connects you.')}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <button
                onClick={() => handleTabChange('companies')}
                className="rounded-lg bg-black px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90"
              >
                {t('tabCompanies', 'For Companies')}
              </button>
              <button
                onClick={() => handleTabChange('job-seekers')}
                className="rounded-lg border-2 border-black bg-white px-6 py-3 font-semibold text-black transition-colors hover:bg-gray-100"
              >
                {t('tabJobSeekers', 'For Job Seekers')}
              </button>
            </div>
          </div>
          <div className="flex-1">
            <div className="mx-auto max-w-64 rounded-3xl border-4 border-gray-200 bg-gradient-to-b from-gray-100 to-white p-6 shadow-xl">
              <div className="aspect-[9/16] rounded-2xl bg-gray-200/50 flex items-center justify-center text-gray-400 text-sm">
                Phone mockup
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION B: DYNAMIC CONTENT */}
      <section className="border-t border-gray-200 bg-white">
        {activeTab === 'job-seekers' && (
          <div id="job-seekers" className="container mx-auto px-4 py-16">
            {/* Sub-Hero */}
            <div className="mt-16 text-center">
              <h2 className="text-2xl font-bold text-black md:text-3xl">
                {t('findJobsTitle', 'Find jobs with Staffer')}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-gray-600">
                {t('findJobsDesc', 'At Staffer you can design your own working life. Browse flexible shifts. Create a profile in 3 minutes.')}
              </p>
            </div>

            {/* Job Board */}
            <div className="mt-12">
              {!shifts || shifts.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">{jobBoard.noJobs ?? 'No active job listings.'}</p>
                    <Button asChild className="mt-4 bg-black hover:bg-gray-800">
                      <Link href={`/${lang}/register`}>{nav.register ?? 'Register'}</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <JobBoardClient
                  shifts={shifts}
                  userRole={userRole}
                  user={user}
                  appliedShiftIds={appliedShiftIds}
                  applicationStatusMap={applicationStatusMap}
                  applicationIdMap={applicationIdMap}
                  verificationStatus={verificationStatus}
                  dict={dict as Parameters<typeof JobBoardClient>[0]['dict']}
                  lang={lang}
                />
              )}
            </div>

            {/* App Download */}
            <div className="mt-20 text-center">
              <h2 className="text-2xl font-bold text-black md:text-3xl">
                {t('downloadAppTitle', 'Download our app!')}
              </h2>
              <div className="mt-6 flex justify-center gap-4">
                <Button variant="outline" size="lg" className="gap-2" asChild>
                  <Link href="#">
                    <Apple className="h-5 w-5" />
                    App Store
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="gap-2" asChild>
                  <Link href="#">
                    <Play className="h-5 w-5" />
                    Google Play
                  </Link>
                </Button>
              </div>
            </div>

            {/* Bottom CTA */}
            <div className="mt-20 w-full rounded-lg bg-black px-6 py-12 text-center md:py-16">
              <p className="text-xl font-semibold text-white md:text-2xl">
                {t('bottomCtaText', 'Create a profile now and see available jobs')}
              </p>
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="mt-6 bg-white text-black hover:bg-gray-100"
              >
                <Link href={`/${lang}/register`}>{t('createProfile', 'Create profile')}</Link>
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'companies' && (
          <div id="companies" className="container mx-auto px-4 py-16">
            <h2 className="text-2xl font-bold text-black md:text-3xl">
              {t('companiesHeadline', 'Find the right employees')}
            </h2>
            <p className="mt-4 max-w-2xl text-gray-600">
              {t('companiesDesc', 'Staffer is your solution when you need the best temporary workers. Hire exactly when you need them.')}
            </p>

            {/* Industries Grid */}
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {INDUSTRIES.map(({ icon: Icon, titleKey, rolesKey }) => (
                <Card key={titleKey} className="overflow-hidden">
                  <div className="flex h-24 items-center justify-center bg-gray-100">
                    <Icon className="h-12 w-12 text-gray-600" />
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-black">{t(titleKey, titleKey)}</h3>
                    <p className="mt-1 text-sm text-gray-600">{t(rolesKey, '')}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Contact Form */}
            <div className="mt-20">
              <h2 className="text-2xl font-bold text-black md:text-3xl">
                {t('contactFormHeadline', "Let's have a non-binding chat about how we can help you.")}
              </h2>
              <form
                className="mt-8 max-w-xl space-y-4"
                onSubmit={(e) => e.preventDefault()}
              >
                <div>
                  <Label htmlFor="name">{t('formName', 'Name')}</Label>
                  <Input
                    id="name"
                    value={contactForm.name}
                    onChange={(e) => setContactForm((p) => ({ ...p, name: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="email">{t('formEmail', 'Email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">{t('formPhone', 'Telephone number')}</Label>
                  <Input
                    id="phone"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm((p) => ({ ...p, phone: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>{t('formIam', 'I am...')}</Label>
                  <Select value={contactForm.iam} onValueChange={(v) => setContactForm((p) => ({ ...p, iam: v }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={t('formIamPlaceholder', 'Select')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="company">Company</SelectItem>
                      <SelectItem value="recruiter">Recruiter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="comment">{t('formComment', 'Comment')}</Label>
                  <Textarea
                    id="comment"
                    value={contactForm.comment}
                    onChange={(e) => setContactForm((p) => ({ ...p, comment: e.target.value }))}
                    className="mt-1"
                    rows={4}
                  />
                </div>
                <Button type="submit" className="bg-black hover:bg-gray-800">
                  {t('contactMe', 'Contact me')}
                </Button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'contact' && (
          <div id="contact" className="container mx-auto px-4 py-16">
            <h2 className="text-2xl font-bold text-black md:text-3xl">
              {t('contactTitle', 'Contact us')}
            </h2>

            <div className="mt-12 flex flex-col gap-12 lg:flex-row lg:gap-16">
              <div className="space-y-6">
                <div>
                  <p className="font-semibold text-black">{t('contactPhone', 'Phone')}</p>
                  <a href="tel:+4512345678" className="text-gray-600 hover:underline">
                    +45 12 34 56 78
                  </a>
                </div>
                <div>
                  <p className="font-semibold text-black">{t('contactEmail', 'Email')}</p>
                  <a href="mailto:support@staffer.dk" className="text-gray-600 hover:underline">
                    support@staffer.dk
                  </a>
                </div>
                <div>
                  <p className="font-semibold text-black">{t('contactHours', 'Opening hours')}</p>
                  <p className="text-gray-600">Mon-Fri 06:00-17:00</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Card className="h-40 shadow-md">
                  <CardContent className="flex h-full flex-col items-center justify-center p-6">
                    <Phone className="mb-3 h-10 w-10 text-black" />
                    <p className="font-semibold text-black">{t('callUs', 'Call us')}</p>
                  </CardContent>
                </Card>
                <Card className="h-40 shadow-md">
                  <CardContent className="flex h-full flex-col items-center justify-center p-6">
                    <MessageCircle className="mb-3 h-10 w-10 text-black" />
                    <p className="font-semibold text-black">{t('chat', 'Chat')}</p>
                  </CardContent>
                </Card>
                <Card className="h-40 shadow-md">
                  <CardContent className="flex h-full flex-col items-center justify-center p-6">
                    <Mail className="mb-3 h-10 w-10 text-black" />
                    <p className="font-semibold text-black">{t('mail', 'Mail')}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0f172a] py-12 text-white">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <h3 className="font-semibold">{t('footerJobSeekers', 'Job seekers')}</h3>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link href={`/${lang}/register`} className="text-gray-400 hover:text-white">
                    {t('footerCreateProfile', 'Create profile')}
                  </Link>
                </li>
                <li>
                  <Link href="#job-seekers" className="text-gray-400 hover:text-white">
                    {t('footerAvailableJobs', 'Available jobs')}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold">{t('footerBusiness', 'Business')}</h3>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white">
                    {t('footerTerms', 'Terms of Trade')}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold">{t('footerFindUs', 'Find us')}</h3>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white">
                    LinkedIn
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white">
                    Facebook
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
