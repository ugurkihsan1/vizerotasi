import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";

const root = process.cwd();
const run = (args, cwd = root) =>
  execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
if (!existsSync("dist-pages/.nojekyll"))
  throw new Error("Önce npm run export:pages çalıştır.");
const remote = run(["remote", "get-url", "origin"]);
const dir = mkdtempSync(join(tmpdir(), "vizerotasi-pages-"));
try {
  run(["init", "-b", "gh-pages"], dir);
  run(["remote", "add", "origin", remote], dir);
  run(["config", "user.name", run(["config", "user.name"])], dir);
  run(["config", "user.email", run(["config", "user.email"])], dir);
  const ref = run(["ls-remote", "--heads", "origin", "gh-pages"], dir);
  if (ref) {
    run(["fetch", "--depth=1", "origin", "gh-pages"], dir);
    // The temporary index/worktree starts empty; parent the new snapshot on the
    // existing Pages commit without touching the source checkout or force push.
    run(["reset", "--soft", "FETCH_HEAD"], dir);
  }
  cpSync(resolve(root, "dist-pages"), dir, { recursive: true });
  run(["add", "--all"], dir);
  const changes = run(["diff", "--cached", "--name-only"], dir);
  if (!changes) console.log("Pages sürümü zaten güncel.");
  else {
    run(
      [
        "commit",
        "-m",
        `Publish web preview from ${run(["rev-parse", "--short", "HEAD"])}`,
      ],
      dir,
    );
    run(["push", "origin", "HEAD:refs/heads/gh-pages"], dir);
    console.log(
      "GitHub Pages dosyaları yüklendi: https://ugurkihsan1.github.io/vizerotasi/",
    );
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
