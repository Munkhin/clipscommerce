import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'ClipsCommerce Terms of Service - Learn about our rules and responsibilities for using our AI-powered content creation platform.',
  openGraph: {
    title: 'Terms of Service | ClipsCommerce',
    description: 'ClipsCommerce Terms of Service - Learn about our rules and responsibilities for using our AI-powered content creation platform.',
  },
  twitter: {
    title: 'Terms of Service | ClipsCommerce',
    description: 'ClipsCommerce Terms of Service - Learn about our rules and responsibilities for using our AI-powered content creation platform.',
  },
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}