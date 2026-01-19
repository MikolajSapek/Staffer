'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FinancialInfoForm from './FinancialInfoForm';
import BillingSettings from './BillingSettings';
import NotificationSettings from './NotificationSettings';
import SecuritySettings from './SecuritySettings';
import LegalSection from './LegalSection';

interface CompanySettingsClientProps {
  userId: string;
  userEmail: string;
  lang: string;
}

export default function CompanySettingsClient({ 
  userId, 
  userEmail, 
  lang 
}: CompanySettingsClientProps) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Tabs Navigation */}
      <Tabs defaultValue="company" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="company">
            Company Details
          </TabsTrigger>
          <TabsTrigger value="billing">
            Billing
          </TabsTrigger>
          <TabsTrigger value="notifications">
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security">
            Security
          </TabsTrigger>
          <TabsTrigger value="legal">
            Legal
          </TabsTrigger>
        </TabsList>

        {/* Tab: Company Details */}
        <TabsContent value="company">
          <FinancialInfoForm userId={userId} />
        </TabsContent>

        {/* Tab: Billing */}
        <TabsContent value="billing">
          <BillingSettings />
        </TabsContent>

        {/* Tab: Notifications */}
        <TabsContent value="notifications">
          <NotificationSettings userId={userId} />
        </TabsContent>

        {/* Tab: Security */}
        <TabsContent value="security">
          <SecuritySettings userEmail={userEmail} lang={lang} />
        </TabsContent>

        {/* Tab: Legal */}
        <TabsContent value="legal">
          <LegalSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
