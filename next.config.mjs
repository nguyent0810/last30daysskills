/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Native `pg` driver: keep external for App Router / server bundles (Vercel).
    serverComponentsExternalPackages: ["pg"],
  },
};

export default nextConfig;
