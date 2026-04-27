/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['stockfish'],
  outputFileTracingIncludes: {
    '/api/coach/analyze': ['./node_modules/stockfish/bin/**/*'],
  },
  webpack(config, { isServer }) {
    if (!isServer) {
      config.resolve.fallback = { ...config.resolve.fallback, fs: false };
    }
    return config;
  },
};

export default nextConfig;
