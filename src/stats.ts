import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const LOG_DIR = join(homedir(), ".local/share/chordgen");

main();

function main() {
  if (!existsSync(LOG_DIR)) {
    console.log(`No chord triggers logged yet. Log dir: ${LOG_DIR}`);
    return;
  }

  const logFiles = readdirSync(LOG_DIR)
    .filter((f) => f.startsWith("chordgen-") && f.endsWith(".log"))
    .sort();

  if (logFiles.length === 0) {
    console.log(`No log files in ${LOG_DIR}`);
    return;
  }

  const allEntries = logFiles.flatMap((f) => parseLog(join(LOG_DIR, f)));
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = Date.now() / 1000 - 7 * 24 * 3600;

  const todayEntries = allEntries.filter(
    (e) => new Date(e.timestamp * 1000).toISOString().slice(0, 10) === today,
  );
  const weekEntries = allEntries.filter((e) => e.timestamp >= sevenDaysAgo);

  reportPeriod(`Today (${today})`, todayEntries);
  reportPeriod("Last 7 days", weekEntries);
  reportPeriod("All time", allEntries);
}

type LogEntry = { timestamp: number; chord: string };

function parseLog(path: string): LogEntry[] {
  return readFileSync(path, "utf8")
    .split("\n")
    .map(parseLine)
    .filter((entry): entry is LogEntry => entry !== null);
}

function parseLine(line: string): LogEntry | null {
  const match = line.match(/^(\d+)\s+(\S+)$/);
  if (!match) return null;
  return { timestamp: Number(match[1]), chord: match[2]! };
}

function reportPeriod(label: string, entries: LogEntry[]) {
  if (entries.length === 0) {
    console.log(`\n${label}: no triggers`);
    return;
  }

  const counts = new Map<string, number>();
  for (const entry of entries) {
    counts.set(entry.chord, (counts.get(entry.chord) ?? 0) + 1);
  }

  const sorted = [...counts.entries()].sort(([, a], [, b]) => b - a);

  console.log(
    `\n${label}: ${entries.length} triggers across ${counts.size} distinct chords`,
  );
  for (const [chord, count] of sorted.slice(0, 10)) {
    console.log(`  ${chord.padEnd(6)} ${count}`);
  }
  if (sorted.length > 10) {
    console.log(`  (+${sorted.length - 10} more chords)`);
  }
}
