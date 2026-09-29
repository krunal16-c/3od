import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@3od/config', '@3od/ui'],
};

export default nextConfig;
