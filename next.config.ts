import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Stop `next dev` from writing an AGENTS.md into the project.
  agentRules: false,
  // kuromoji reads its dictionary from disk at runtime; don't bundle it.
  serverExternalPackages: ["kuromoji"],
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
