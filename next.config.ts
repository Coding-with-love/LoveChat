import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ["bczxumlinvewyplybksk.supabase.co"],
  },
  serverExternalPackages: ["pdf-parse"],
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
