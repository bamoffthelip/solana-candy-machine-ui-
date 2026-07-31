/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@crossmint/client-sdk-react-ui",
    "@crossmint/client-sdk-react-base",
    "@crossmint/wallets-sdk",
  ],
};

module.exports = nextConfig
