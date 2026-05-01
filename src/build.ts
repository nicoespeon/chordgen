import { readdirSync } from "node:fs";
import { join } from "node:path";
import {
	entryToManipulator,
	entryToShiftedManipulator,
	mechanicalListenerManipulator,
	overrideListenerManipulator,
	V2_PENDING_REGULAR,
	type Manipulator,
} from "./generate-rule.ts";
import { writeRulePack } from "./karabiner-sync.ts";
import { parseTsvFile, type ChordEntry } from "./parse-tsv.ts";

const PROJECT_ROOT = join(import.meta.dirname, "..");
const CHORDS_DIR = join(PROJECT_ROOT, "chords");

main();

function main() {
	const tsvFiles = readdirSync(CHORDS_DIR)
		.filter((f) => f.endsWith(".tsv"))
		.sort();

	if (tsvFiles.length === 0) {
		console.error(`No .tsv files in ${CHORDS_DIR}`);
		process.exit(1);
	}

	const allEntries: ChordEntry[] = [];
	const allErrors: string[] = [];
	const seenChords = new Map<string, string>();

	for (const file of tsvFiles) {
		const { entries, errors } = parseTsvFile(join(CHORDS_DIR, file));
		allErrors.push(...errors);
		allErrors.push(...findCrossFileDuplicates(entries, seenChords));
		allEntries.push(...entries);
		console.log(`  ${file}: ${entries.length} chords`);
	}

	if (allErrors.length > 0) {
		console.error(`\n${allErrors.length} error(s):\n`);
		for (const err of allErrors) console.error(`  ${err}`);
		process.exit(1);
	}

	const sortedEntries = [...allEntries].sort(
		(a, b) => b.chord.length - a.chord.length,
	);

	let nextOverrideId = 1;
	const overrideEntries: Array<{ entry: ChordEntry; pendingValue: number }> = [];
	let hasRegularChord = false;

	const chordManipulators = sortedEntries.flatMap((entry) => {
		const pendingValue = (() => {
			if (!entry.trailingSpace) return null;
			if (entry.pluralOverride) {
				const id = nextOverrideId++;
				overrideEntries.push({ entry, pendingValue: id });
				return id;
			}
			hasRegularChord = true;
			return V2_PENDING_REGULAR;
		})();
		return [
			entryToShiftedManipulator(entry, pendingValue),
			entryToManipulator(entry, pendingValue),
		];
	});

	const listenerManipulators: Manipulator[] = [];
	if (hasRegularChord) {
		listenerManipulators.push(mechanicalListenerManipulator("left_shift"));
		listenerManipulators.push(mechanicalListenerManipulator("right_shift"));
	}
	for (const { entry, pendingValue } of overrideEntries) {
		listenerManipulators.push(
			overrideListenerManipulator(entry, pendingValue, "left_shift"),
		);
		listenerManipulators.push(
			overrideListenerManipulator(entry, pendingValue, "right_shift"),
		);
	}

	const manipulators = [...chordManipulators, ...listenerManipulators];
	const totalChords = allEntries.length;
	const rule = {
		description: `chordgen (${totalChords} chords across ${tsvFiles.length} dictionaries)`,
		manipulators,
	};

	const { distPath, assetsPath, syncedProfiles } = writeRulePack(rule);

	console.log(`\n✔ Generated ${totalChords} chords`);
	console.log(`  → ${distPath}`);
	console.log(`  → ${assetsPath}`);
	if (syncedProfiles) {
		console.log(`  → live in ${syncedProfiles} profile(s) (Karabiner reloads automatically)`);
	} else {
		console.log(
			`\nFirst run: Complex Modifications → Add rule → enable "chordgen". After that, this build syncs automatically.`,
		);
	}
}

function findCrossFileDuplicates(
	entries: ChordEntry[],
	seen: Map<string, string>,
): string[] {
	const errors: string[] = [];
	for (const entry of entries) {
		const normalized = [...entry.chord].sort().join("");
		const previous = seen.get(normalized);
		if (previous) {
			errors.push(
				`${entry.source}:${entry.line} — chord "${entry.chord}" already defined in ${previous} (chords are order-insensitive)`,
			);
			continue;
		}
		seen.set(normalized, `${entry.source}:${entry.line}`);
	}
	return errors;
}
