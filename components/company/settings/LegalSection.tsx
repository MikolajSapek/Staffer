'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function LegalSection() {
  const { toast } = useToast();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Legal & Terms</CardTitle>
        <CardDescription>
          Review our terms of service and legal documents
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Terms of Service */}
          <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
            <a 
              href="#" 
              className="flex items-center justify-between group"
              onClick={(e) => {
                e.preventDefault();
                // Placeholder - link to terms when available
                toast({
                  title: 'Coming Soon',
                  description: 'Terms of Service will be available soon',
                  variant: 'default',
                });
              }}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-semibold group-hover:text-blue-600 transition-colors">
                    Terms of Service
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Review our platform terms and conditions
                  </p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-blue-600 transition-colors" />
            </a>
          </div>

          {/* Privacy Policy */}
          <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
            <a 
              href="#" 
              className="flex items-center justify-between group"
              onClick={(e) => {
                e.preventDefault();
                // Placeholder - link to privacy policy when available
                toast({
                  title: 'Coming Soon',
                  description: 'Privacy Policy will be available soon',
                  variant: 'default',
                });
              }}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-semibold group-hover:text-blue-600 transition-colors">
                    Privacy Policy
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Learn how we protect and handle your data
                  </p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-blue-600 transition-colors" />
            </a>
          </div>

          {/* Cookie Policy */}
          <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
            <a 
              href="#" 
              className="flex items-center justify-between group"
              onClick={(e) => {
                e.preventDefault();
                // Placeholder - link to cookie policy when available
                toast({
                  title: 'Coming Soon',
                  description: 'Cookie Policy will be available soon',
                  variant: 'default',
                });
              }}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-semibold group-hover:text-blue-600 transition-colors">
                    Cookie Policy
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Information about our cookie usage
                  </p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-blue-600 transition-colors" />
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
