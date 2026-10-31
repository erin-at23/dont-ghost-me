import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Phones reach the dev server through an HTTPS tunnel (mic/camera need HTTPS).
  allowedDevOrigins: ["*.trycloudflare.com", "*.ngrok-free.app", "*.ngrok.app"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
