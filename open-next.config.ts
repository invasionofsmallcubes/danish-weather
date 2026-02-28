import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // Optional: Configure caching behavior
  // See: https://opennext.js.org/cloudflare/caching
  //
  // Example custom caching rules:
  // caching: {
  //   "/api/weather": {
  //     ttl: 300, // Cache API responses for 5 minutes
  //   },
  //   "/_next/static/*": {
  //     ttl: 86400, // Cache static assets for 1 day
  //   },
  // }
});
