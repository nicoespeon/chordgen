import { writeRulePack } from "./karabiner-sync.ts";

main();

function main() {
	const sentinel = {
		type: "basic",
		from: { key_code: "f19" },
		conditions: [
			{
				type: "variable_if",
				name: "chordgen_disabled_marker",
				value: 1,
			},
		],
		to: [{ key_code: "f19" }],
		description: "chordgen no-op sentinel (never fires)",
	};

	const { distPath, assetsPath, syncedProfiles } = writeRulePack({
		description: "chordgen (disabled — 0 active chords)",
		manipulators: [sentinel],
	});

	console.log("✔ chordgen disabled (0 active chords)");
	console.log(`  → ${distPath}`);
	console.log(`  → ${assetsPath}`);
	if (syncedProfiles) {
		console.log(
			`  → live in ${syncedProfiles} profile(s) (Karabiner reloads automatically)`,
		);
		console.log("  Re-enable with: pnpm build");
	} else {
		console.log(
			"\nNo active profile imports chordgen yet — disable is a no-op until the rule is imported once via the Karabiner GUI.",
		);
	}
}
