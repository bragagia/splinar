/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
    serverMinification: false, // Needed for defer
  },
};

module.exports = nextConfig;
