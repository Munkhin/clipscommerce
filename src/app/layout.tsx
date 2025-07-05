import './globals.css';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/providers/AuthProvider';
import { SettingsProvider } from '@/providers/SettingsProvider';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlobalErrorBoundary } from '@/components/errors/GlobalErrorBoundary';
import { AnalyticsProvider } from '@/components/analytics/AnalyticsProvider';
import { setUser, addBreadcrumb } from '@/lib/errors/errorReporting';
import { URL } from 'url';
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { StagewiseToolbar } from "@stagewise/toolbar-next";
import { ReactPlugin } from "@stagewise-plugins/react";
import { GeistSans } from "geist/font/sans"
import { Toaster } from "sonner"

const inter = Inter({ 
  subsets: ['latin'], 
  display: 'swap',
  variable: '--font-inter',
});

// Default metadata (will be overridden by individual pages)
export const metadata = {
  metadataBase: new URL('https://clipscommerce.com'),
  title: {
    default: 'ClipsCommerce - AI-Powered Content That Sells',
    template: '%s | ClipsCommerce'
  },
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
  themeColor: '#8B5CF6',
  viewportFit: 'cover',
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
        <link
          rel="preload"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          as="style"
          onLoad="this.onload=null;this.rel='stylesheet'"
        />
        <noscript>
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          />
        </noscript>
        
        {/* PWA Meta Tags */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/images/ChatGPT Image Jun 1, 2025, 07_27_54 PM.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="ClipsCommerce" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#8B5CF6" />
        <meta name="msapplication-TileImage" content="/images/ChatGPT Image Jun 1, 2025, 07_27_54 PM.png" />
        
        {/* Performance and Resource Hints */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
        <meta name="format-detection" content="telephone=no" />
        
        {/* iOS Safe Area Support */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className={`${inter.className} antialiased flex flex-col h-screen`}>
        <AnalyticsProvider>
          <AuthProvider>
            <SettingsProvider>
              <AppLayout>
                {children}
              </AppLayout>
            </SettingsProvider>
          </AuthProvider>
        </AnalyticsProvider>
        <SpeedInsights />
        <StagewiseToolbar config={{ plugins: [new ReactPlugin()] }} />
      </body>
    </html>
  );
}
