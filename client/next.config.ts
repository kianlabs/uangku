import type { NextConfig } from "next";

// Server-side only — tidak di-expose ke browser
const serverUrl = process.env.SERVER_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  // Hanya gunakan standalone output jika bukan di Vercel (misal: Docker / local)
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
  compress: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "motion"],
    cpus: 1,
  },
  async headers() {
    return [
      {
        source: "/icons/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
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
