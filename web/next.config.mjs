import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: (process.env.BACKEND_URL || 'http://localhost:8000') + '/:path*',
      },
    ];
  },
};

export default withNextIntl(nextConfig);
