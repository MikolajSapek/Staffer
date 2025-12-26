import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // Ensure route groups work correctly
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Output configuration for Vercel
  output: 'standalone',
};

export default nextConfig;

