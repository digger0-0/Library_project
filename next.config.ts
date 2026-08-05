import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a self-contained server bundle in .next/standalone/
  // Can be copied to a bare server and run with `node server.js`
  output: "standalone",
  // DEV-ONLY — never included in production / portable builds:
  // Server Actions reject cross-origin requests (CSRF protection) unless the
  // origin is whitelisted. Through VS Code's "Forward a Port" tunnel
  // (*.asse.devtunnels.ms) the tunnel REWRITES the browser's `Origin` header to
  // the local upstream address (http://localhost:3000) while setting
  // `x-forwarded-host` to the public tunnel host, so the CSRF check fails.
  // Whitelisting the rewritten origin only in development lets `npm run dev`
  // work over the tunnel. `next build` sets NODE_ENV=production, so production
  // and portable builds ship without this relaxation.
  ...(process.env.NODE_ENV === "development"
    ? {
        experimental: {
          serverActions: {
            allowedOrigins: ["localhost:3000"],
          },
        },
      }
    : {}),
};

export default nextConfig;
