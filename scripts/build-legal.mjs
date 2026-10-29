import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { bundledLegalDocuments } from "./sync-legal.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const documents = JSON.parse(
  readFileSync(`${root}src/content/legal-documents.json`, "utf8"),
);
if (JSON.stringify(documents) !== JSON.stringify(bundledLegalDocuments()))
  throw new Error(
    "Legal documents changed. Run node scripts/sync-legal.mjs before exporting.",
  );

const escape = (text) =>
  text.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
const inline = (text) =>
  escape(text).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

for (const document of documents) {
  const sections = document.sections
    .map(
      (section, index) => `<section aria-labelledby="section-${index}">
<h2 id="section-${index}">${escape(section.heading)}</h2>
${section.blocks
  .map((block) =>
    block.kind === "paragraph"
      ? `<p>${inline(block.text)}</p>`
      : `<ul>${block.items.map((item) => `<li>${inline(item)}</li>`).join("")}</ul>`,
  )
  .join("\n")}</section>`,
    )
    .join("\n");
  const otherLinks = documents
    .filter((other) => other.id !== document.id)
    .map(
      (other) =>
        `<a href="./${other.filename}">${escape(other.shortTitle)}</a>`,
    )
    .join(" ");
  writeFileSync(
    `${root}dist-pages/${document.filename}`,
    `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="referrer" content="no-referrer">
<title>${escape(document.shortTitle)} — Vizesel</title>
<meta name="description" content="${escape(document.title)}">
<style>
:root{color-scheme:light dark;--bg:#fff;--text:#262626;--heading:#111;--muted:#666;--border:#e4e4e4}
@media(prefers-color-scheme:dark){:root{--bg:#080808;--text:#e4e4e4;--heading:#f2f2f2;--muted:#aaa;--border:#343434}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.65 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow-wrap:anywhere}
main{max-width:760px;margin:auto;padding:24px 20px 48px}h1,h2{color:var(--heading);line-height:1.35}h1{font-size:clamp(24px,5vw,32px);margin:20px 0 12px}h2{font-size:20px;margin:30px 0 12px}p{margin:12px 0}ul{padding-left:24px}li{margin:8px 0}.date{color:var(--muted);font-size:14px}a{color:var(--heading);text-underline-offset:3px}nav{display:flex;flex-wrap:wrap;gap:8px 24px;border-top:1px solid var(--border);margin-top:32px;padding-top:16px}nav a{display:inline-flex;align-items:center;min-height:44px}
</style>
</head>
<body><main>
<header><a href="./">Vizesel</a><h1>${escape(document.title)}</h1><p class="date">Son güncelleme: ${escape(document.updatedAt)}</p></header>
${sections}
<nav aria-label="Yasal bilgiler">${otherLinks}<a href="mailto:vizeselapp@gmail.com">İletişim</a></nav>
</main></body>
</html>\n`,
  );
}
