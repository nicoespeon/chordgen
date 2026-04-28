import {
	appendFileSync,
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { type ChordEntry, parseTsvFile } from "./parse-tsv.ts";

const PROJECT_ROOT = join(import.meta.dirname, "..");
const CHORDS_DIR = join(PROJECT_ROOT, "chords");
const HISTORY_DIR = join(homedir(), ".local/share/chordgen");
const HISTORY_FILE = join(HISTORY_DIR, "practice.jsonl");

const UNSEEN_CHORD_WEIGHT = 2;
const MIN_ACCURACY_FOR_WEIGHT = 0.1;

type HistoryRecord = {
	timestamp: number;
	chord: string;
	success: boolean;
	elapsed_ms: number;
};

main();

async function main() {
	const chords = loadAllChords();
	if (chords.length === 0) {
		console.error("No chords found.");
		process.exit(1);
	}

	const history = loadHistory();
	const weights = computeWeights(chords, history);

	mkdirSync(HISTORY_DIR, { recursive: true });

	console.log(
		`\nchordgen practice — ${chords.length} chords. Press Ctrl-C to quit.\n`,
	);

	const sessionRecords: HistoryRecord[] = [];
	const chordsByCode = new Map(chords.map((c) => [c.chord, c]));
	let lastChord: string | null = null;

	const rl = createInterface({ input: process.stdin, output: process.stdout });
	rl.on("close", () => {
		printSummary(sessionRecords, chordsByCode);
		process.exit(0);
	});

	while (true) {
		const entry = pickWeighted(chords, weights, lastChord);
		const start = Date.now();
		const correct = sessionRecords.filter((r) => r.success).length;
		const answer = await rl.question(
			`[${correct}/${sessionRecords.length}] Type chord for: ${entry.output}\n> `,
		);
		const elapsed = Date.now() - start;

		const success = answer.replace(/\s+$/, "") === entry.output;

		const record: HistoryRecord = {
			timestamp: Math.floor(start / 1000),
			chord: entry.chord,
			success,
			elapsed_ms: elapsed,
		};
		appendFileSync(HISTORY_FILE, `${JSON.stringify(record)}\n`);
		history.push(record);
		sessionRecords.push(record);
		weights.set(entry.chord, computeWeight(entry.chord, history));
		lastChord = entry.chord;

		if (success) {
			console.log(`✓ correct (${elapsed}ms)\n`);
		} else {
			console.log(`✗ expected chord: ${entry.chord}\n`);
		}
	}
}

function loadAllChords(): ChordEntry[] {
	return readdirSync(CHORDS_DIR)
		.filter((f) => f.endsWith(".tsv"))
		.flatMap((f) => parseTsvFile(join(CHORDS_DIR, f)).entries);
}

function loadHistory(): HistoryRecord[] {
	if (!existsSync(HISTORY_FILE)) return [];
	return readFileSync(HISTORY_FILE, "utf8")
		.split("\n")
		.filter((line) => line.trim() !== "")
		.map((line) => JSON.parse(line) as HistoryRecord);
}

function computeWeights(
	chords: ChordEntry[],
	history: HistoryRecord[],
): Map<string, number> {
	const weights = new Map<string, number>();
	for (const chord of chords) {
		weights.set(chord.chord, computeWeight(chord.chord, history));
	}
	return weights;
}

function computeWeight(chord: string, history: HistoryRecord[]): number {
	const records = history.filter((r) => r.chord === chord);
	if (records.length === 0) return UNSEEN_CHORD_WEIGHT;
	const successCount = records.filter((r) => r.success).length;
	const accuracy = successCount / records.length;
	return 1 / Math.max(accuracy, MIN_ACCURACY_FOR_WEIGHT);
}

function pickWeighted(
	chords: ChordEntry[],
	weights: Map<string, number>,
	exclude: string | null,
): ChordEntry {
	const candidates = chords.filter((c) => c.chord !== exclude);
	const total = candidates.reduce(
		(sum, c) => sum + (weights.get(c.chord) ?? 0),
		0,
	);
	let r = Math.random() * total;
	for (const chord of candidates) {
		r -= weights.get(chord.chord) ?? 0;
		if (r <= 0) return chord;
	}
	return candidates[0] ?? chords[0]!;
}

function printSummary(
	records: HistoryRecord[],
	chordsByCode: Map<string, ChordEntry>,
) {
	if (records.length === 0) {
		console.log("\nNo chords practiced this session.");
		return;
	}

	const correct = records.filter((r) => r.success).length;
	const accuracy = ((correct / records.length) * 100).toFixed(1);
	console.log(`\nSession: ${correct}/${records.length} (${accuracy}%)`);

	const failsByChord = new Map<string, number>();
	for (const r of records) {
		if (r.success) continue;
		failsByChord.set(r.chord, (failsByChord.get(r.chord) ?? 0) + 1);
	}

	if (failsByChord.size === 0) return;

	const sorted = [...failsByChord.entries()].sort(([, a], [, b]) => b - a);
	console.log(`\nMissed chords:`);
	for (const [chord, fails] of sorted) {
		const entry = chordsByCode.get(chord);
		const output = entry?.output ?? "?";
		const total = records.filter((r) => r.chord === chord).length;
		console.log(`  ${chord.padEnd(6)} → ${output.padEnd(15)} ${fails}/${total} fail`);
	}
}
