import { readFileSync } from "node:fs";
import { detectFingerConflict } from "./fingers.ts";

export type ChordEntry = {
	chord: string;
	output: string;
	trailingSpace: boolean;
	pluralOverride: string | undefined;
	source: string;
	line: number;
};

export type ParseResult = {
	entries: ChordEntry[];
	errors: string[];
};

export function parseTsvFile(path: string): ParseResult {
	const content = readFileSync(path, "utf8");
	const filename = path.split("/").pop() ?? path;
	return parseTsvContent(content, filename);
}

export function parseTsvContent(
	content: string,
	filename: string,
): ParseResult {
	const entries: ChordEntry[] = [];
	const errors: string[] = [];

	content.split("\n").forEach((line, idx) => {
		const result = parseLine(line, filename, idx + 1);
		if (result.entry) entries.push(result.entry);
		if (result.error) errors.push(result.error);
	});

	return { entries, errors };
}

type LineResult = { entry?: ChordEntry; error?: string };

function parseLine(line: string, source: string, lineNumber: number): LineResult {
	const stripped = line.replace(/[\r\n]+$/, "");
	const trimmed = stripped.trim();
	if (trimmed === "" || trimmed.startsWith("#")) return {};

	const fields = stripped.split("\t").map((f) => f.trim());
	if (fields.length < 2 || fields[0] === "") {
		return { error: `${source}:${lineNumber} — missing TAB separator: "${line}"` };
	}

	const chord = fields[0]!;
	const rawOutput = fields[1]!;
	const overrideField: string | undefined = fields[2];

	if (chord.length < 2 || chord.length > 4) {
		return { error: `${source}:${lineNumber} — chord "${chord}" must be 2-4 keys` };
	}
	if (rawOutput === "") {
		return { error: `${source}:${lineNumber} — empty output for chord "${chord}"` };
	}
	if (hasDuplicateChars(chord)) {
		return { error: `${source}:${lineNumber} — chord "${chord}" has duplicate keys` };
	}

	const fingerConflict = detectFingerConflict(chord);
	if (fingerConflict) {
		return {
			error: `${source}:${lineNumber} — chord "${chord}" has finger conflict: '${fingerConflict.char1}' and '${fingerConflict.char2}' both use ${fingerConflict.finger}`,
		};
	}

	const trailingSpace = !rawOutput.endsWith("^");
	const output = trailingSpace ? rawOutput : rawOutput.slice(0, -1);

	let pluralOverride: string | undefined;
	if (overrideField !== undefined) {
		if (overrideField === "") {
			return {
				error: `${source}:${lineNumber} — empty plural override for chord "${chord}" (omit the trailing TAB or fill in the irregular plural)`,
			};
		}
		if (!trailingSpace) {
			return {
				error: `${source}:${lineNumber} — caret chord "${chord}" cannot have a plural column (caret chords are excluded from v2 modifier)`,
			};
		}
		pluralOverride = overrideField;
	}

	return {
		entry: {
			chord,
			output,
			trailingSpace,
			pluralOverride,
			source,
			line: lineNumber,
		},
	};
}

function hasDuplicateChars(s: string): boolean {
	return new Set(s).size !== s.length;
}
