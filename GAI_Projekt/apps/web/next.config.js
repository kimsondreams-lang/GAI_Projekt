/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  output: 'standalone',
  env: {
    BACKEND_URL: process.env.BACKEND_URL || "http://localhost:8000",
    WS_URL: process.env.WS_URL || "ws://localhost:8000",
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.BACKEND_URL || 'http://localhost:8000'}/api/:path*`,
      },
    ];
  },
  images: {
    domains: ['localhost'],
  },
}
