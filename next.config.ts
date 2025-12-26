import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // Ensure route groups work correctly
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Ensure proper handling of route groups
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;

