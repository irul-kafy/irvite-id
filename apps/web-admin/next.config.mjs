/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/templates/:slug/demo',
        destination: 'https://irvite-id.vercel.app/templates/:slug/demo',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
