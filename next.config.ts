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
};

export default nextConfig;

