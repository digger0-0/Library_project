import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a self-contained server bundle in .next/standalone/
  // Can be copied to a bare server and run with `node server.js`
  output: "standalone",
};

export default nextConfig;
