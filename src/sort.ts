import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export function sortContent(content: string): string {
	if (content === "") return "";

	const trailingNewline = content.endsWith("\n");
	const lines = content.split("\n");
	const workLines = trailingNewline ? lines.slice(0, -1) : lines;

	const sections: Section[] = [];
	let current = newSection();
	let pendingBlanks: string[] = [];

	for (const line of workLines) {
		const kind = classify(line);

		if (kind === "comment" && current.data.length > 0) {
			current.trailingBlanks = pendingBlanks;
			sections.push(current);
			current = newSection();
			pendingBlanks = [];
		}

		if (kind === "data") {
			pendingBlanks = [];
			current.data.push(line);
		} else if (kind === "blank") {
			if (current.data.length > 0) {
				pendingBlanks.push(line);
			} else {
				current.prefix.push(line);
			}
		} else {
			current.prefix.push(line);
		}
	}
	current.trailingBlanks = pendingBlanks;
	sections.push(current);

	const out: string[] = [];
	for (const sec of sections) {
		out.push(
			...sec.prefix,
			...[...sec.data].sort(byOutput),
			...sec.trailingBlanks,
		);
	}

	return out.join("\n") + (trailingNewline ? "\n" : "");
}

type Section = {
	prefix: string[];
	data: string[];
	trailingBlanks: string[];
};

type LineKind = "comment" | "blank" | "data";

function newSection(): Section {
	return { prefix: [], data: [], trailingBlanks: [] };
}

function classify(line: string): LineKind {
	const trimmed = line.trim();
	if (trimmed === "") return "blank";
	if (trimmed.startsWith("#")) return "comment";
	return "data";
}

function byOutput(a: string, b: string): number {
	const oa = outputOf(a);
	const ob = outputOf(b);
	return oa < ob ? -1 : oa > ob ? 1 : 0;
}

function outputOf(line: string): string {
	const tabIndex = line.indexOf("\t");
	if (tabIndex === -1) return line;
	return line.slice(tabIndex + 1).trim();
}

const CHORDS_DIR = "chords";

function main() {
	const arg = process.argv[2];
	const files = arg ? [arg] : listChordFiles();

	for (const file of files) {
		const content = readFileSync(file, "utf8");
		const sorted = sortContent(content);
		if (sorted !== content) {
			writeFileSync(file, sorted);
			console.log(`sorted: ${file}`);
		}
	}
}

function listChordFiles(): string[] {
	if (!existsSync(CHORDS_DIR)) return [];
	return readdirSync(CHORDS_DIR)
		.filter((f) => f.endsWith(".tsv"))
		.map((f) => join(CHORDS_DIR, f));
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
	main();
}
