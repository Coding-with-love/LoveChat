import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ["bczxumlinvewyplybksk.supabase.co"],
  },
  serverExternalPackages: ["pdf-parse"],
  // disable eslint

  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  rewrites: async () => {
    return [
      {
        source: "/((?!api/).*)",
        destination: "/static-app-shell",
      },
    ];
  },
};

export default nextConfig;
