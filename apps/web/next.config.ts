import type { NextConfig } from "next";

const allowedDevOrigins = [
  // Next expects hostnames here (no scheme / port).
  "noj4.dev",
  "dev.noj4.dev",
  "localhost",
  "127.0.0.1",
  "10.140.0.3",
];

const nextConfig: NextConfig = {
  // Run `next dev` and `next start` in parallel without corrupting each other's build output.
  // PM2 sets `NEXT_DIST_DIR` per process.
  distDir:
    process.env.NEXT_DIST_DIR ||
    (process.env.NODE_ENV === "development" ? ".next-dev" : ".next-prod"),
  // Allow proxied Next.js dev endpoints (HMR / dev overlay) from these origins.
  // This prevents Next from blocking `/_next/*` requests when running behind Caddy/Cloudflare.
  // Note: some Next.js versions still read this from `experimental`.
  allowedDevOrigins,
};

export default nextConfig;
