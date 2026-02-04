/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    // Fix for xterm SSR
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'xterm': 'commonjs xterm',
        'xterm-addon-fit': 'commonjs xterm-addon-fit',
      });
    }

    return config;
  },
};

module.exports = nextConfig;
