import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // Ensure route groups work correctly
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Ignore TypeScript errors during build
  typescript: {
    ignoreBuildErrors: true,
  },
  // Ignore ESLint errors during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Supabase images configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  // Security headers configuration
  async headers() {
    const isDevelopment = process.env.NODE_ENV === 'development';

    const cspHeader = `
      default-src 'self';
      script-src 'self' 'unsafe-inline' ${isDevelopment ? "'unsafe-eval'" : ""} https://*.supabase.co https://va.vercel-scripts.com https://www.googletagmanager.com;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.mathpix.com;
      img-src 'self' blob: data: https: http: https://*.supabase.co;
      font-src 'self' data: https://fonts.gstatic.com;
      connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.vercel-insights.com${isDevelopment ? ' http://localhost:* ws://localhost:*' : ''};
      ${!isDevelopment ? 'upgrade-insecure-requests;' : ''}
    `.replace(/\s{2,}/g, ' ').trim();

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
        ],
      },
    ];
  },
};

export default nextConfig;

