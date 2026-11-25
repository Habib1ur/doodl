import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@doodlio/shared'],
  reactStrictMode: true,
};

export default nextConfig;
