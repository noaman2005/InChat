/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    compiler: {
      reactRemoveProperties: false,
    },
    webpack(config) {
      config.resolve.fallback = { fs: false, path: false };
      return config;
    },
  };
  
  export default nextConfig;
  