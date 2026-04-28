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

	const session = { tested: 0, correct: 0 };
	let lastChord: string | null = null;

	const rl = createInterface({ input: process.stdin, output: process.stdout });
	rl.on("close", () => {
		printSummary(session);
		process.exit(0);
	});

	while (true) {
		const entry = pickWeighted(chords, weights, lastChord);
		const start = Date.now();
		const answer = await rl.question(
			`[${session.correct}/${session.tested}] Type chord for: ${entry.output}\n> `,
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
		weights.set(entry.chord, computeWeight(entry.chord, history));
		lastChord = entry.chord;

		session.tested++;
		if (success) {
			session.correct++;
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

function printSummary(session: { tested: number; correct: number }) {
	if (session.tested === 0) {
		console.log("\nNo chords practiced this session.");
		return;
	}
	const accuracy = ((session.correct / session.tested) * 100).toFixed(1);
	console.log(
		`\nSession: ${session.correct}/${session.tested} (${accuracy}%) ✓`,
	);
}
