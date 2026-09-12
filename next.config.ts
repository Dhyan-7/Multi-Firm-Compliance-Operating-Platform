/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
