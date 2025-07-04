import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Real Results & Success Stories',
  description: 'See how creators and businesses are transforming their social media presence with ClipsCommerce. View real performance metrics and success stories.',
  openGraph: {
    title: 'Real Results & Success Stories | ClipsCommerce',
    description: 'See how creators and businesses are transforming their social media presence with ClipsCommerce. View real performance metrics and success stories.',
  },
  twitter: {
    title: 'Real Results & Success Stories | ClipsCommerce',
    description: 'See how creators and businesses are transforming their social media presence with ClipsCommerce. View real performance metrics and success stories.',
  },
};

export default function ResultsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}