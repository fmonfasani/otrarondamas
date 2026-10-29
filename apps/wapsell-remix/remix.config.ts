import type { Config } from "@remix-run/dev";

export default {
  // Route configuration
  ignoredRouteFiles: ["**/.*", "**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts"],

  // Module format
  serverModuleFormat: "esm",

  // Asset optimization
  assetsBuildDirectory: "public/build",
  publicPath: "/build/",

  // Server configuration
  watchPaths: [
    "./app/**/*",
    "../packages/**/*",
  ],

  // Development server
  dev: {
    port: 3000,
    appDirectory: "app",
  },

  // Environment variables
  serverDependenciesToBundle: [
    // Add dependencies that need to be bundled for server
  ],

  // Future flags
  future: {
    v3_fetcherPersist: true,
    v3_relativeSplatPath: true,
    v3_throwAbortReason: true,
  },
} satisfies Config;
