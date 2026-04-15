/**
 * Some PaaS templates default Start Command to: node src/server.js
 * The real API is backend/index.js — run `npm run render-build` first so backend/node_modules exists.
 */
import("../backend/index.js").catch((err) => {
  console.error(err);
  process.exit(1);
});
