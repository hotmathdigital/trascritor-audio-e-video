import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "600mb",
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // fluent-ffmpeg and ffmpeg-static ship native binaries.
      // Bundling them into .next breaks the binary paths at runtime —
      // mark them as external so Node resolves them from node_modules directly.
      const existing = Array.isArray(config.externals) ? config.externals : [];
      config.externals = [...existing, "fluent-ffmpeg", "ffmpeg-static"];
    }
    return config;
  },
};

export default nextConfig;
