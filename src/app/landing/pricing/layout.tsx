import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing Plans - Choose Your Content Success Plan',
  description: 'Choose the perfect ClipsCommerce pricing plan for your business. From Lite to Team plans, get AI-powered content creation, autoposting, and analytics to grow your social media presence.',
  openGraph: {
    title: 'Pricing Plans - Choose Your Content Success Plan | ClipsCommerce',
    description: 'Choose the perfect ClipsCommerce pricing plan for your business. From Lite to Team plans, get AI-powered content creation, autoposting, and analytics to grow your social media presence.',
  },
  twitter: {
    title: 'Pricing Plans - Choose Your Content Success Plan | ClipsCommerce',
    description: 'Choose the perfect ClipsCommerce pricing plan for your business. From Lite to Team plans, get AI-powered content creation, autoposting, and analytics to grow your social media presence.',
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}