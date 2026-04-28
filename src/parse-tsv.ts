import { readFileSync } from "node:fs";
import { detectFingerConflict } from "./fingers.ts";

export type ChordEntry = {
  chord: string;
  output: string;
  trailingSpace: boolean;
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
  const trimmed = line.trim();
  if (trimmed === "" || trimmed.startsWith("#")) return {};

  const tabIndex = trimmed.indexOf("\t");
  if (tabIndex === -1) {
    return { error: `${source}:${lineNumber} — missing TAB separator: "${line}"` };
  }

  const chord = trimmed.slice(0, tabIndex).trim();
  const rawOutput = trimmed.slice(tabIndex + 1).trim();

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

  return { entry: { chord, output, trailingSpace, source, line: lineNumber } };
}

function hasDuplicateChars(s: string): boolean {
  return new Set(s).size !== s.length;
}
