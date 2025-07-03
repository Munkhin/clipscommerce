const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  
  // Minimal experimental features
  experimental: {
    optimizeCss: false,
    scrollRestoration: false,
  },

  // Basic path aliases only
  webpack: (config, { isServer, dev }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
      '@/app': path.resolve(__dirname, 'src/app'),
      '@/components': path.resolve(__dirname, 'src/components'),
      '@/lib': path.resolve(__dirname, 'src/lib'),
      '@/hooks': path.resolve(__dirname, 'src/hooks'),
      '@/types': path.resolve(__dirname, 'src/types'),
      '@/utils': path.resolve(__dirname, 'src/utils'),
    };

    return config;
  },

  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;