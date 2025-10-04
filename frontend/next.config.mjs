// frontend/next.config.mjs

/** @type {import('next').NextConfig} */
const nextConfig = {
  // CRITICAL FIX: The react-pdf package is causing issues and needs to be explicitly 
  // transpiled by Next.js to resolve its internal dependencies (like the CSS imports).
  transpilePackages: ['react-pdf'],
};

export default nextConfig;