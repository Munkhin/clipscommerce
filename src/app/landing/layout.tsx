import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Short-Form Content Platform | ClipsCommerce',
  description: 'The leading AI-powered short-form content creation platform for e-commerce sellers. Generate viral TikTok, Instagram, and YouTube content that converts viewers into customers.',
  openGraph: {
    title: 'AI Short-Form Content Platform | ClipsCommerce',
    description: 'The leading AI-powered short-form content creation platform for e-commerce sellers. Generate viral TikTok, Instagram, and YouTube content that converts viewers into customers.',
  },
  twitter: {
    title: 'AI Short-Form Content Platform | ClipsCommerce',
    description: 'The leading AI-powered short-form content creation platform for e-commerce sellers. Generate viral TikTok, Instagram, and YouTube content that converts viewers into customers.',
  },
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}