/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      // NextJS <Image> component needs to whitelist domains for src={}
      "lh3.googleusercontent.com",
      "pbs.twimg.com",
      "images.unsplash.com",
      "logos-world.net",
    ],
  },
  experimental: {
    serverComponentsExternalPackages: [
      '@whiskeysockets/baileys',
      'sharp',
      'puppeteer'
    ]
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        '@whiskeysockets/baileys': 'commonjs @whiskeysockets/baileys',
        'pino': 'commonjs pino',
        'pino-pretty': 'commonjs pino-pretty'
      });
    }
    return config;
  },
};

module.exports = nextConfig;
