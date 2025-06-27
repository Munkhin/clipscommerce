import './globals.css';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/providers/AuthProvider';
import { SettingsProvider } from '@/providers/SettingsProvider';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlobalErrorBoundary } from '@/components/errors/GlobalErrorBoundary';
import { setUser, addBreadcrumb } from '@/lib/errors/errorReporting';
import { URL } from 'url';

const inter = Inter({ 
  subsets: ['latin'], 
  display: 'swap',
  variable: '--font-inter',
});

// Production metadata
export const metadata = {
  metadataBase: new URL('https://clipscommerce.com'),
  title: 'ClipsCommerce - AI-Powered Content That Sells',
  description: 'Transform your social media content into sales with AI-powered optimization. Generate viral content, automate posting, and boost conversions with ClipsCommerce.',
  keywords: 'AI content creation, social media automation, e-commerce marketing, viral content, TikTok marketing, Instagram marketing, content optimization',
  authors: [{ name: 'ClipsCommerce' }],
  robots: 'index, follow',
  openGraph: {
    title: 'ClipsCommerce - AI-Powered Content That Sells',
    description: 'Transform your social media content into sales with AI-powered optimization.',
    type: 'website',
    url: 'https://clipscommerce.com',
    images: [
      {
        url: '/images/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ClipsCommerce - AI-Powered Content That Sells',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ClipsCommerce - AI-Powered Content That Sells',
    description: 'Transform your social media content into sales with AI-powered optimization.',
    images: ['/images/twitter-card.png'],
    site: '@clipscommerce',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.className} antialiased flex flex-col h-screen`}>
        <AuthProvider>
          <SettingsProvider>
            <AppLayout>
              {children}
            </AppLayout>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
