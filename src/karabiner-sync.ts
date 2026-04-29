import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const PROJECT_ROOT = join(import.meta.dirname, "..");
const DIST_DIR = join(PROJECT_ROOT, "dist");
const KARABINER_RULES_DIR = join(
	homedir(),
	".config/karabiner/assets/complex_modifications",
);
const KARABINER_CONFIG = join(homedir(), ".config/karabiner/karabiner.json");
const OUTPUT_FILENAME = "chordgen.json";
const RULE_DESCRIPTION_PREFIX = "chordgen";

export type Rule = {
	description: string;
	manipulators: unknown[];
};

export type SyncResult = {
	distPath: string;
	assetsPath: string;
	syncedProfiles: number;
};

export function writeRulePack(rule: Rule): SyncResult {
	const pack = { title: "chordgen", rules: [rule] };
	const json = JSON.stringify(pack, null, 2);

	mkdirSync(DIST_DIR, { recursive: true });
	const distPath = join(DIST_DIR, OUTPUT_FILENAME);
	writeFileSync(distPath, json);

	mkdirSync(KARABINER_RULES_DIR, { recursive: true });
	const assetsPath = join(KARABINER_RULES_DIR, OUTPUT_FILENAME);
	writeFileSync(assetsPath, json);

	const syncedProfiles = syncActiveProfile(rule);
	return { distPath, assetsPath, syncedProfiles };
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
