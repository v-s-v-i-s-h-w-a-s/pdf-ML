import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CRITICAL FIX: The react-pdf package needs to be transpiled by Next.js to
  // avoid build-time errors caused by its internal dependencies (CSS imports
  // and modern syntax). This mirrors the working upstream repository.
  transpilePackages: ["react-pdf"],
};

export default nextConfig;
