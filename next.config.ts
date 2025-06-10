import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    domains: ['bczxumlinvewyplybksk.supabase.co'],
  },
  serverExternalPackages: ['pdf-parse'],
  rewrites: async () => {
    return [
      {
        source: '/((?!api/).*)',
        destination: '/static-app-shell',
      },
    ];
  },
};

export default nextConfig;
