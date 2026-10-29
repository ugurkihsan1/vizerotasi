import { copyFileSync, writeFileSync } from "node:fs";
import "./build-legal.mjs";
// GitHub Pages serves this SPA shell for deep links, including auth callbacks.
// Keep the URL/query/fragment intact so Expo Router and Supabase can consume it.
copyFileSync("dist-pages/index.html", "dist-pages/404.html");
writeFileSync("dist-pages/.nojekyll", "");
