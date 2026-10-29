import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Markdown is the editorial source. The bundled JSON is also used by the
// standalone policy pages, so the app and public pages show the same version.
const root = fileURLToPath(new URL("../", import.meta.url));
const documents = [
  {
    id: "privacy",
    file: "GIZLILIK_POLITIKASI.md",
    shortTitle: "Gizlilik politikası",
    filename: "privacy.html",
    version: "2026-10-29.1",
  },
  {
    id: "transfer",
    file: "YURT_DISI_AKTARIM_ACIK_RIZA_TASLAK.md",
    shortTitle: "Yurt dışına aktarım",
    filename: "transfer-consent.html",
    version: "2026-10-29.1",
  },
  {
    id: "terms",
    file: "KULLANIM_KOSULLARI.md",
    shortTitle: "Kullanım koşulları",
    filename: "terms.html",
    version: "2026-10-29.1",
  },
];

export function bundledLegalDocuments() {
  return documents.map(({ file, ...metadata }) => {
    const markdown = readFileSync(`${root}docs/${file}`, "utf8").trim();
    const lines = markdown.split("\n");
    const title = lines.shift().replace(/^# /, "");
    const date = lines.find((line) =>
      /^\*\*(Son güncelleme|Sürüm):/.test(line),
    );
    const updatedAt = date?.replace(/^\*\*[^:]+:\s*/, "").replace(/\*\*$/, "");
    const sections = [];
    let section;
    let paragraph = [];
    let items = [];
    const flush = () => {
      if (paragraph.length) {
        section.blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
        paragraph = [];
      }
      if (items.length) {
        section.blocks.push({ kind: "list", items });
        items = [];
      }
    };
    for (const line of lines) {
      if (!line.trim() || line === date) {
        if (section) flush();
        continue;
      }
      if (line.startsWith("## ")) {
        if (section) flush();
        section = { heading: line.slice(3), blocks: [] };
        sections.push(section);
      } else if (section) {
        if (line.startsWith("- ")) {
          if (paragraph.length) flush();
          items.push(line.slice(2).trim());
        } else {
          if (items.length) flush();
          paragraph.push(line.trim());
        }
      }
    }
    if (section) flush();
    if (!title || !updatedAt || !sections.length)
      throw new Error(`Legal document is incomplete: ${file}`);
    return { ...metadata, title, updatedAt, sections };
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(`${root}src/content`, { recursive: true });
  writeFileSync(
    `${root}src/content/legal-documents.json`,
    `${JSON.stringify(bundledLegalDocuments(), null, 2)}\n`,
  );
}
