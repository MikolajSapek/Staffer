'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Plus } from 'lucide-react';

export default function BillingSettings() {
  // This is a placeholder UI - no actual card data is stored in database
  const hasPaymentMethod = false; // Change to true to show mock card details

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Methods</CardTitle>
        <CardDescription>
          Manage your payment methods for subscription and services
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Payment Method Section */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Card details for payments</h3>
            
            {!hasPaymentMethod ? (
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <CreditCard className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No payment method added</p>
                <Button variant="default" size="lg">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Card
                </Button>
                <p className="text-xs text-muted-foreground mt-3">
                  Your card information will be securely stored by our payment provider
                </p>
              </div>
            ) : (
              // Mock card display (when hasPaymentMethod is true)
              <div className="border rounded-lg p-6 bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold">•••• •••• •••• 4242</p>
                      <p className="text-sm text-muted-foreground">Expires 12/25</p>
                    </div>
                  </div>
                  <Button variant="outline">Update</Button>
                </div>
              </div>
            )}
          </div>

          {/* Billing History - Placeholder */}
          <div className="pt-6 border-t">
            <h3 className="text-sm font-semibold mb-3">Billing History</h3>
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <p className="text-muted-foreground text-sm">
                Your billing history will appear here
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
