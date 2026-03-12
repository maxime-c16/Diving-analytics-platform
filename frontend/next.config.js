/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for optimal Docker deployment
  // This creates a minimal production server with only necessary files
  output: 'standalone',
  
  // Note: telemetry is disabled via NEXT_TELEMETRY_DISABLED=1 env var
  
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  
  // Production optimizations
  swcMinify: true,
  reactStrictMode: true,
  
  // Reduce build output
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Environment variables available to the client
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
    NEXT_PUBLIC_COMPUTE_URL: process.env.NEXT_PUBLIC_COMPUTE_URL || '/compute',
  },
}

module.exports = nextConfig
