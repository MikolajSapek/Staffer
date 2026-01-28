import { getDictionary } from '@/app/[lang]/dictionaries';
import SupportForm from '@/components/support/SupportForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Mail, Clock } from 'lucide-react';

export default async function SupportPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang as 'en-US' | 'da');

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Contact Information */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{dict.support.contact_info}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Phone */}
              <div className="flex items-start space-x-3">
                <Phone className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">
                    {dict.support.phone}
                  </p>
                  <a
                    href="tel:+4512345678"
                    className="text-primary hover:underline"
                  >
                    +45 12 34 56 78
                  </a>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start space-x-3">
                <Mail className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">
                    {dict.support.email}
                  </p>
                  <a
                    href="mailto:support@staffer.com"
                    className="text-primary hover:underline"
                  >
                    support@staffer.com
                  </a>
                </div>
              </div>

              {/* Hours */}
              <div className="flex items-start space-x-3">
                <Clock className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">
                    {dict.support.hours}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Info Card (Optional) */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <p className="text-sm text-blue-900">
                💡 <strong>Tip:</strong> For faster assistance, please include as much detail as possible in your message.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Contact Form */}
        <div>
          <SupportForm dict={dict.support} />
        </div>
      </div>
    </div>
  );
}
