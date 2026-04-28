import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { entryToManipulator, type Manipulator } from "./generate-rule.ts";
import { parseTsvFile, type ChordEntry } from "./parse-tsv.ts";

const PROJECT_ROOT = join(import.meta.dirname, "..");
const CHORDS_DIR = join(PROJECT_ROOT, "chords");
const DIST_DIR = join(PROJECT_ROOT, "dist");
const KARABINER_RULES_DIR = join(
  homedir(),
  ".config/karabiner/assets/complex_modifications",
);
const KARABINER_CONFIG = join(homedir(), ".config/karabiner/karabiner.json");
const OUTPUT_FILENAME = "chordgen.json";
const RULE_DESCRIPTION_PREFIX = "chordgen";

type Rule = {
  description: string;
  manipulators: Manipulator[];
};

type RulePack = {
  title: string;
  rules: Rule[];
};

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
  const manipulators = sortedEntries.map(entryToManipulator);

  const totalChords = allEntries.length;
  const rules: Rule[] = [
    {
      description: `chordgen (${totalChords} chords across ${tsvFiles.length} dictionaries)`,
      manipulators,
    },
  ];

  const pack: RulePack = { title: "chordgen", rules };
  const json = JSON.stringify(pack, null, 2);

  mkdirSync(DIST_DIR, { recursive: true });
  writeFileSync(join(DIST_DIR, OUTPUT_FILENAME), json);

  mkdirSync(KARABINER_RULES_DIR, { recursive: true });
  writeFileSync(join(KARABINER_RULES_DIR, OUTPUT_FILENAME), json);

  const synced = syncActiveProfile(rules[0]!);

  console.log(`\n✔ Generated ${totalChords} chords`);
  console.log(`  → ${join(DIST_DIR, OUTPUT_FILENAME)}`);
  console.log(`  → ${join(KARABINER_RULES_DIR, OUTPUT_FILENAME)}`);
  if (synced) {
    console.log(`  → live in ${synced} profile(s) (Karabiner reloads automatically)`);
  } else {
    console.log(
      `\nFirst run: Complex Modifications → Add rule → enable "chordgen". After that, this build syncs automatically.`,
    );
  }
}

function syncActiveProfile(newRule: Rule): number {
  if (!existsSync(KARABINER_CONFIG)) return 0;

  const config = JSON.parse(readFileSync(KARABINER_CONFIG, "utf8"));
  let updatedProfiles = 0;

  for (const profile of config.profiles ?? []) {
    const rules = profile.complex_modifications?.rules;
    if (!rules) continue;

    const idx = rules.findIndex((r: { description?: string }) =>
      r.description?.startsWith(RULE_DESCRIPTION_PREFIX),
    );
    if (idx === -1) continue;

    rules[idx] = newRule;
    updatedProfiles++;
  }

  if (updatedProfiles === 0) return 0;

  writeFileSync(KARABINER_CONFIG, JSON.stringify(config, null, 4));
  return updatedProfiles;
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
