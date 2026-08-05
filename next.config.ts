import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a self-contained server bundle in .next/standalone/
  // Can be copied to a bare server and run with `node server.js`
  output: "standalone",
  // Server Actions reject cross-origin requests (CSRF protection) unless the
  // origin is whitelisted. Through VS Code's "Forward a Port" tunnel
  // (*.asse.devtunnels.ms) the tunnel REWRITES the browser's `Origin` header to
  // the local upstream address (http://localhost:3000) while setting
  // `x-forwarded-host` to the public tunnel host. Next.js compares those two
  // and rejects the action. Whitelisting the rewritten origin fixes it.
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
};

export default nextConfig;
