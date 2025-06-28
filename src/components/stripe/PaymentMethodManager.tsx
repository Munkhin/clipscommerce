'use client';

import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { stripeService, type PaymentMethod } from '@/services/stripeService';
import { CreditCard, Trash2, Check, Plus, Loader2, AlertCircle } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#ffffff',
      '::placeholder': {
        color: '#9ca3af',
      },
      backgroundColor: 'transparent',
    },
    invalid: {
      color: '#ef4444',
      iconColor: '#ef4444',
    },
  },
  hidePostalCode: true,
};

interface AddPaymentMethodFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

function AddPaymentMethodForm({ onSuccess, onCancel }: AddPaymentMethodFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      // Create setup intent
      const { client_secret } = await stripeService.createPaymentMethodSetupIntent();

      // Confirm setup intent
      const { error: confirmError } = await stripe.confirmCardSetup(client_secret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to add payment method');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border border-gray-600 rounded-lg bg-gray-800">
        <CardElement options={CARD_ELEMENT_OPTIONS} />
      </div>

      {error && (
        <Alert className="bg-red-500/10 border-red-500/20 text-red-400">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Button 
          type="submit" 
          disabled={!stripe || isLoading}
          className="btn-primary"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Add Payment Method
            </>
          )}
        </Button>
        <Button 
          type="button" 
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          className="bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

interface PaymentMethodManagerProps {
  className?: string;
}

export default function PaymentMethodManager({ className = '' }: PaymentMethodManagerProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setIsLoading(true);
      const methods = await stripeService.getPaymentMethods();
      setPaymentMethods(methods);
    } catch (err: any) {
      setError(err.message || 'Failed to load payment methods');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSuccess = () => {
    setShowAddForm(false);
    setSuccessMessage('Payment method added successfully');
    setTimeout(() => setSuccessMessage(null), 5000);
    loadPaymentMethods();
  };

  const handleDelete = async (paymentMethodId: string) => {
    if (!confirm('Are you sure you want to delete this payment method?')) {
      return;
    }

    try {
      await stripeService.deletePaymentMethod(paymentMethodId);
      setSuccessMessage('Payment method deleted successfully');
      setTimeout(() => setSuccessMessage(null), 5000);
      loadPaymentMethods();
    } catch (err: any) {
      setError(err.message || 'Failed to delete payment method');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleSetDefault = async (paymentMethodId: string) => {
    try {
      await stripeService.setDefaultPaymentMethod(paymentMethodId);
      setSuccessMessage('Default payment method updated');
      setTimeout(() => setSuccessMessage(null), 5000);
      loadPaymentMethods();
    } catch (err: any) {
      setError(err.message || 'Failed to set default payment method');
      setTimeout(() => setError(null), 5000);
    }
  };

  return (
    <div className={className}>
      {error && (
        <Alert className="bg-red-500/10 border-red-500/20 text-red-400 mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 mb-4">
          <Check className="h-4 w-4" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
          <span className="ml-2 text-gray-400">Loading payment methods...</span>
        </div>
      ) : (
        <>
          {paymentMethods.length === 0 && !showAddForm ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">No payment methods on file</p>
              <Button 
                onClick={() => setShowAddForm(true)}
                className="btn-primary"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Payment Method
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {paymentMethods.map((method) => (
                <Card key={method.id} className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-700 rounded-lg">
                          <CreditCard className="h-5 w-5 text-gray-300" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">
                              {stripeService.getCardBrandIcon(method.card?.brand || '')}
                              {method.card?.brand?.toUpperCase()} ending in {method.card?.last4}
                            </span>
                            {method.default && (
                              <Badge className="bg-violet-500/20 text-violet-400 border-violet-400/30">
                                Default
                              </Badge>
                            )}
                          </div>
                          <p className="text-gray-400 text-sm">
                            Expires {method.card?.exp_month}/{method.card?.exp_year}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!method.default && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetDefault(method.id)}
                            className="bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                          >
                            Set as Default
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(method.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {!showAddForm && (
                <Button 
                  onClick={() => setShowAddForm(true)}
                  variant="outline"
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white border-gray-600"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Another Payment Method
                </Button>
              )}
            </div>
          )}

          {showAddForm && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Add New Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <Elements stripe={stripePromise}>
                  <AddPaymentMethodForm
                    onSuccess={handleAddSuccess}
                    onCancel={() => setShowAddForm(false)}
                  />
                </Elements>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}