import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { parseTsvFile } from "./parse-tsv.ts";

const PROJECT_ROOT = join(import.meta.dirname, "..");
const CHORDS_DIR = join(PROJECT_ROOT, "chords");
const MIN_WORD_LENGTH = 4;
const MIN_OCCURRENCES = 3;
const TOP_N = 100;

main();

function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: pnpm analyze <path-to-markdown-dir>");
    process.exit(1);
  }

  const files = collectMarkdownFiles(path);
  console.error(`Scanning ${files.length} markdown file(s)...`);

  const counts = new Map<string, number>();
  for (const file of files) {
    countWords(readFileSync(file, "utf8"), counts);
  }

  const alreadyChorded = loadExistingChordOutputs();
  const candidates = [...counts.entries()]
    .filter(([word, n]) => n >= MIN_OCCURRENCES && !alreadyChorded.has(word))
    .sort(([, a], [, b]) => b - a)
    .slice(0, TOP_N);

  console.log("freq\tword\n----\t----\n");
  for (const [word, count] of candidates) {
    console.log(`${count}\t${word}`);
  }

  console.error(
    `\n${candidates.length} candidates (${MIN_WORD_LENGTH}+ chars, ${MIN_OCCURRENCES}+ occurrences, not already chorded). Pipe to a file: pnpm analyze <path> > suggestions.tsv`,
  );
}

function collectMarkdownFiles(rootPath: string): string[] {
  const stat = statSync(rootPath);
  if (stat.isFile()) {
    return rootPath.endsWith(".md") ? [rootPath] : [];
  }

  const files: string[] = [];
  for (const entry of readdirSync(rootPath, { withFileTypes: true })) {
    const fullPath = join(rootPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(fullPath));
    } else if (entry.isFile() && extname(entry.name) === ".md") {
      files.push(fullPath);
    }
  }
  return files;
}

function countWords(content: string, counts: Map<string, number>) {
  const stripped = content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/^---[\s\S]*?^---/m, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, " ");

  const words = stripped.toLowerCase().match(/[a-zàâäéèêëîïôöùûüÿç']+/g) ?? [];

  for (const word of words) {
    if (word.length < MIN_WORD_LENGTH) continue;
    if (word.startsWith("'") || word.endsWith("'")) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
}

function loadExistingChordOutputs(): Set<string> {
  const outputs = new Set<string>();
  for (const file of readdirSync(CHORDS_DIR)) {
    if (!file.endsWith(".tsv")) continue;
    for (const entry of parseTsvFile(join(CHORDS_DIR, file)).entries) {
      outputs.add(entry.output.toLowerCase().trim());
    }
  }
  return outputs;
}
