/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    webpackMemoryOptimizations: true,
  },
  async redirects() {
    return [
      { source: "/app/notion", destination: "/app/dashboard", permanent: false },
      { source: "/app/notion/:path*", destination: "/app/dashboard", permanent: false },
    ];
  },
};

export default nextConfig;
