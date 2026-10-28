import type { Config } from "@remix-run/dev";

export default {
  ignoredRouteFiles: ["**/.*"],
  serverModuleFormat: "esm",
} satisfies Config;
