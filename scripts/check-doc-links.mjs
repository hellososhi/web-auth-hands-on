import { readdir, readFile, access } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

async function markdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await markdownFiles(filename));
    else if (entry.name.endsWith(".md")) files.push(filename);
  }
  return files;
}

const files = [
  path.join(root, "README.md"),
  path.join(root, "tests/README.md"),
  ...await markdownFiles(path.join(root, "docs")),
];
const failures = [];
let checked = 0;

for (const filename of files) {
  const content = (await readFile(filename, "utf8")).replace(/```[\s\S]*?```/g, "");
  const links = [
    ...content.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g),
    ...content.matchAll(/^\[[^\]]+\]:\s*(\S+)/gm),
  ];
  for (const match of links) {
    const href = match[1];
    if (/^(?:[a-z][a-z\d+.-]*:|#|\/\/)/i.test(href)) continue;
    const target = href.split(/[?#]/)[0];
    if (!target) continue;
    checked += 1;
    try {
      await access(path.resolve(path.dirname(filename), decodeURIComponent(target)));
    } catch {
      failures.push(path.relative(root, filename) + " -> " + href);
    }
  }
}

if (failures.length) {
  console.error("リンク先が見つかりません:\n" + failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(files.length + " Markdown files / " + checked + " relative links: OK");
}

