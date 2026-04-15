/**
 * Entry for: node server.js
 * Loads the API from backend/index.js (ESM).
 */
import("./backend/index.js").catch((err) => {
  console.error(err);
  process.exit(1);
});
