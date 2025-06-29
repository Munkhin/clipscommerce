'use client';

import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';

export type PaymentMethod = {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  created: number;
  default?: boolean;
};

export type Invoice = {
  id: string;
  amount_paid: number;
  currency: string;
  status: string;
  created: number;
  hosted_invoice_url?: string;
  invoice_pdf?: string;
  period_start: number;
  period_end: number;
  subscription_id?: string;
};

export type BillingHistory = {
  invoices: Invoice[];
  has_more: boolean;
  total_count: number;
};

class StripeService {
  private stripe: Promise<Stripe | null>;
  private elements: StripeElements | null = null;

  constructor() {
    this.stripe = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }

  async getStripe(): Promise<Stripe | null> {
    return await this.stripe;
  }

  async createPaymentMethodSetupIntent(): Promise<{ client_secret: string; setup_intent_id: string }> {
    try {
      // Get CSRF token
      const csrfResponse = await fetch('/api/auth/csrf');
      const { csrfToken } = await csrfResponse.json();

      const response = await fetch('/api/stripe/setup-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to create setup intent');
      }

      return await response.json();
    } catch (error) {
      // Log error in development only
      if (process.env.NODE_ENV === 'development') {
        console.error('Error creating setup intent:', error);
      }
      throw error;
    }
  }

  async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      const response = await fetch('/api/stripe/payment-methods', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch payment methods');
      }

      const data = await response.json();
      return data.payment_methods || [];
    } catch (error) {
      // Log error in development only
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching payment methods:', error);
      }
      throw error;
    }
  }

  async deletePaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      // Get CSRF token
      const csrfResponse = await fetch('/api/auth/csrf');
      const { csrfToken } = await csrfResponse.json();

      const response = await fetch(`/api/stripe/payment-methods/${paymentMethodId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete payment method');
      }
    } catch (error) {
      // Log error in development only
      if (process.env.NODE_ENV === 'development') {
        console.error('Error deleting payment method:', error);
      }
      throw error;
    }
  }

  async setDefaultPaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      // Get CSRF token
      const csrfResponse = await fetch('/api/auth/csrf');
      const { csrfToken } = await csrfResponse.json();

      const response = await fetch('/api/stripe/default-payment-method', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ payment_method_id: paymentMethodId }),
      });

      if (!response.ok) {
        throw new Error('Failed to set default payment method');
      }
    } catch (error) {
      // Log error in development only
      if (process.env.NODE_ENV === 'development') {
        console.error('Error setting default payment method:', error);
      }
      throw error;
    }
  }

  async getBillingHistory(params?: {
    limit?: number;
    starting_after?: string;
  }): Promise<BillingHistory> {
    try {
      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.starting_after) searchParams.set('starting_after', params.starting_after);

      const response = await fetch(`/api/stripe/billing-history?${searchParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch billing history');
      }

      return await response.json();
    } catch (error) {
      // Log error in development only
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching billing history:', error);
      }
      throw error;
    }
  }

  async getUpcomingInvoice(): Promise<Invoice | null> {
    try {
      const response = await fetch('/api/stripe/upcoming-invoice', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // No upcoming invoice
        }
        throw new Error('Failed to fetch upcoming invoice');
      }

      return await response.json();
    } catch (error) {
      // Log error in development only
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching upcoming invoice:', error);
      }
      throw error;
    }
  }

  async createCustomerPortalSession(): Promise<{ url: string }> {
    try {
      // Get CSRF token
      const csrfResponse = await fetch('/api/auth/csrf');
      const { csrfToken } = await csrfResponse.json();

      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to create customer portal session');
      }

      return await response.json();
    } catch (error) {
      // Log error in development only
      if (process.env.NODE_ENV === 'development') {
        console.error('Error creating customer portal session:', error);
      }
      throw error;
    }
  }

  formatCurrency(amount: number, currency: string = 'usd'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100); // Stripe amounts are in cents
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  getCardBrandIcon(brand: string): string {
    switch (brand.toLowerCase()) {
      case 'visa':
        return '💳'; // In a real app, you'd use proper SVG icons
      case 'mastercard':
        return '💳';
      case 'amex':
        return '💳';
      case 'discover':
        return '💳';
      default:
        return '💳';
    }
  }

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'text-emerald-400';
      case 'open':
        return 'text-blue-400';
      case 'draft':
        return 'text-gray-400';
      case 'void':
        return 'text-red-400';
      case 'uncollectible':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  }
}

export const stripeService = new StripeService();