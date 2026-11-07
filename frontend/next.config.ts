import type { NextConfig } from "next";

const BACKEND_ORIGIN =
  process.env.BACKEND_INTERNAL_ORIGIN || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "*.ngrok-free.app",
    "*.ngrok.app",
    "*.ngrok.io",
    "*.devtunnels.ms",
    "localhost",
    "127.0.0.1",
  ],
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${BACKEND_ORIGIN}/api/:path*`,
      },
      {
        source: "/static/:path*",
        destination: `${BACKEND_ORIGIN}/static/:path*`,
      },
    ];
  },
};

export default nextConfig;
