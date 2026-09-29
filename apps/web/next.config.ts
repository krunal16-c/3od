import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'https://3od-api-worker.3od.workers.dev',
  },
  transpilePackages: ['@3od/config', '@3od/ui'],
};

export default nextConfig;
