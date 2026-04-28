import {
	bepoCharToKey,
	bepoCharToKeys,
	toKarabinerKey,
} from "./bepo-keymap.ts";
import type { ChordEntry } from "./parse-tsv.ts";

const THRESHOLDS_BY_CHORD_LENGTH: Record<number, number> = {
	2: 25,
	3: 50,
	4: 80,
};
const FALLBACK_THRESHOLD_MS = 50;
const LOG_DIR = "$HOME/.local/share/chordgen";

export type Manipulator = {
	type: "basic";
	from: {
		simultaneous: Array<{ key_code: string }>;
		simultaneous_options: {
			key_down_order: "insensitive";
			key_up_order: "insensitive";
		};
		modifiers: { optional: string[] };
	};
	parameters: {
		"basic.simultaneous_threshold_milliseconds": number;
	};
	to: Array<{ key_code: string; modifiers?: string[] }>;
	to_after_key_up: Array<{ shell_command: string }>;
	description: string;
};

export function entryToManipulator(entry: ChordEntry): Manipulator {
	const fromKeys = [...entry.chord].map((char) => {
		const key = bepoCharToKey(char);
		if (key.shift) {
			throw new Error(
				`${entry.source}:${entry.line} — chord "${entry.chord}" requires shift on '${char}', not supported in chord input`,
			);
		}
		return { key_code: key.key_code };
	});

	const outputChars = entry.trailingSpace ? entry.output + " " : entry.output;
	const toKeys = [...outputChars]
		.flatMap((char) => bepoCharToKeys(char))
		.map(toKarabinerKey);

	return {
		type: "basic",
		from: {
			simultaneous: fromKeys,
			simultaneous_options: {
				key_down_order: "insensitive",
				key_up_order: "insensitive",
			},
			modifiers: { optional: ["any"] },
		},
		parameters: {
			"basic.simultaneous_threshold_milliseconds":
				THRESHOLDS_BY_CHORD_LENGTH[entry.chord.length] ?? FALLBACK_THRESHOLD_MS,
		},
		to: toKeys,
		to_after_key_up: [
			{
				shell_command: `mkdir -p "${LOG_DIR}" && echo "$(date +%s) ${entry.chord}" >> "${LOG_DIR}/chordgen-$(date +%Y-%m).log"`,
			},
		],
		description: `${entry.chord} → ${entry.output}${entry.trailingSpace ? "␣" : ""}`,
	};
}
