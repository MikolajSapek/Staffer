import { getDictionary } from '@/app/[lang]/dictionaries';
import SupportForm from '@/components/support/SupportForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Mail, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function WorkerSupportPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang as 'en-US' | 'da');

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>{dict.support.contact_info}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <Phone className="h-5 w-5 text-slate-700 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900">{dict.support.phone}</p>
                  <a href="tel:+4512345678" className="text-slate-600 hover:text-slate-900 hover:underline">
                    +45 12 34 56 78
                  </a>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Mail className="h-5 w-5 text-slate-700 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900">{dict.support.email}</p>
                  <a href="mailto:support@staffer.com" className="text-slate-600 hover:text-slate-900 hover:underline">
                    support@staffer.com
                  </a>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Clock className="h-5 w-5 text-slate-700 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900">{dict.support.hours}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="pt-6">
              <p className="text-sm text-slate-700">
                💡 <strong>Tip:</strong> For faster assistance, please include as much detail as possible in your message.
              </p>
            </CardContent>
          </Card>
        </div>
        <div>
          <SupportForm dict={dict.support} />
        </div>
      </div>
    </div>
  );
}
