import { readFileSync } from "node:fs";
import { join } from "node:path";

const FINGERS_PATH = join(import.meta.dirname, "..", "fingers.tsv");

export type FingerConflict = {
  char1: string;
  char2: string;
  finger: string;
};

export function detectFingerConflict(chord: string): FingerConflict | null {
  const used = new Map<string, string>();
  for (const char of chord) {
    const finger = fingerMap.get(char);
    if (!finger) continue;
    const previous = used.get(finger);
    if (previous) return { char1: previous, char2: char, finger };
    used.set(finger, char);
  }
  return null;
}

const fingerMap = loadFingerMap();

function loadFingerMap(): Map<string, string> {
  const content = readFileSync(FINGERS_PATH, "utf8");
  const map = new Map<string, string>();

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;

    const tabIndex = trimmed.indexOf("\t");
    if (tabIndex === -1) continue;

    const char = trimmed.slice(0, tabIndex);
    const finger = trimmed.slice(tabIndex + 1).trim();
    if (char && finger) map.set(char, finger);
  }

  return map;
}
