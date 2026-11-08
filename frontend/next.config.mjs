/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Standalone output — required for Docker production image
  // Comment this out for local `npm run dev`
  // output: "standalone",

  // Proxy /api/backend/* → FastAPI backend (dev only)
  // In production, set NEXT_PUBLIC_API_URL env var instead
  async rewrites() {
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    return [
      {
        source: "/api/backend/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;

