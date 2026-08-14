import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow Next.js to transpile the shared classifier workspace package
  transpilePackages: ['@token-pilot/classifier'],

  // Forward dashboard API calls to the NestJS gateway server-side
  async rewrites() {
    const gatewayUrl = process.env.GATEWAY_URL ?? 'http://localhost:3000';
    return [
      {
        source: '/gateway/:path*',
        destination: `${gatewayUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
