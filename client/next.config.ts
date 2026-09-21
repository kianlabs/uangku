import type { NextConfig } from "next";

// Server-side only — tidak di-expose ke browser
const serverUrl = process.env.SERVER_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${serverUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
