# CLAUDE.md

Context for Claude Code working on chordgen.

## What this is

Personal tool that turns simultaneous keypress chords into typed words via Karabiner-Elements. The user types in **BÉPO 1.1 rc2** (the bepo.fr/wiki/MacOS variant) on a **Keyboardio Model 100**. Goal: faster typing for high-frequency words without leaving the regular keyboard.

## How it works

- TSV chord lists in `chords/*.tsv` define `chord<TAB>output` pairs. Chords are 2-4 BÉPO characters; the user types them as if typing those characters in BÉPO (the build maps to physical key codes).
- `pnpm build` parses the TSVs, validates them, generates a Karabiner `complex_modifications` rule pack at `dist/chordgen.json`, copies it to `~/.config/karabiner/assets/complex_modifications/`, AND directly patches the active Karabiner profile in `~/.config/karabiner/karabiner.json` (auto-sync — first import is manual via the GUI, after that builds are live without re-import).
- Each chord trigger logs to `~/.local/share/chordgen/chordgen-YYYY-MM.log` via Karabiner's `to_after_key_up` `shell_command`. `pnpm stats` reads these.
- `pnpm practice` is a weighted-random drill: lower per-chord accuracy → higher pick weight. History at `~/.local/share/chordgen/practice.jsonl`. Independent from real-world stats.
- `pnpm analyze <dir>` scans markdown files (e.g., a Notion export) and prints word-frequency candidates the user hasn't chorded yet.
- `pnpm sort` reorders `chords/*.tsv` by output column (alpha). Comments delimit sections; data is sorted within each section, sections stay in source order. A `simple-git-hooks` pre-commit hook runs sort + `git add chords/*.tsv` before each commit.
- `pnpm disable` pushes a 0-manipulator rule pack to Karabiner (chord typing temporarily off). TSVs are untouched. Re-enable with `pnpm build`.

## File map

```
chords/                  TSV chord lists (en, fr, dev — extend freely)
fingers.tsv              BÉPO char → finger map. Source of truth for the conflict check.
src/
  build.ts               Orchestrator: parse all TSVs, validate, generate JSON, sync.
  disable.ts             Push an empty rule pack to Karabiner (temporary off-switch). TSVs untouched.
  karabiner-sync.ts      Shared module: write rule pack to dist/, assets dir, and patch active profile.
  parse-tsv.ts           Per-line parsing + per-chord validation (length, dup chars, finger conflict).
  fingers.ts             Loads fingers.tsv, exposes `detectFingerConflict`.
  bepo-keymap.ts         BÉPO char → physical Karabiner key_code (with shift state, dead-key sequences for ê/â/î/ô/û).
  generate-rule.ts       Builds one Karabiner manipulator per chord. Adaptive threshold table (25/50/80ms by length).
  stats.ts               Parses chord trigger log files.
  analyze.ts             Word-frequency scanner for markdown corpora.
  practice.ts            Weighted-random drill CLI with end-of-session review.
  sort.ts                Sort chord files alpha by output, sections delimited by comments. Pure logic + CLI entry.
  sort.test.ts           Vitest suite for sortContent.
  parse-tsv.test.ts      Vitest suite for parseTsvContent (incl. 3rd-column plural override).
  generate-rule.test.ts  Vitest suite for chord + v2 listener manipulators.
```

## Conventions

- **TSV format**: `chord<TAB>output`. Trailing `^` on output disables auto-space (use for prefixes or `useEffect(`-style suffixes).
- **Order-insensitive chords**: same key set = same chord. Build catches cross-file collisions.
- **No subset chords by accident**: 2-key chords coexist with 3-key supersets (e.g., `th` + `tha`). Build sorts manipulators by length descending so longer matches first.
- **No same-finger chords**: build rejects them via `fingers.tsv` lookup.
- **Adaptive threshold**: 25ms (2-key) / 50ms (3-key) / 80ms (4-key). Edit `THRESHOLDS_BY_CHORD_LENGTH` in `src/generate-rule.ts`.
- **Auto-sync**: build only updates a profile that already imported the rule once (matched by description prefix). First import is a one-time manual step.
- **Sort + partial commits**: the pre-commit hook runs `pnpm sort` against the working tree and re-stages all of `chords/*.tsv`. If you ever do a partial-stage on a TSV (e.g. `git add -p`), the hook will stage the unstaged parts too. Accepted trade-off — partial commits on TSVs aren't a current workflow.

## Karabiner gotchas the user already hit

- **Modify events on the right interface**: Model 100 exposes 3 HID interfaces (keyboard-only, keyboard+pointing, pointing-only). Letter keypresses come through the **keyboard+pointing** composite — that's the one where "Modify events" must be enabled. EventViewer shows keypresses regardless of which interface they arrive from, which is misleading: a chord rule loaded fine + visible keys + chord not firing = wrong-interface "Modify events".
- **Description prefix match**: auto-sync uses `description.startsWith("chordgen")`. If the user renames the rule via the GUI, sync stops working until they re-import.

## Coding style

- Match existing file patterns. Tabs (the user's `.zed/settings.json` sets `hard_tabs: true`).
- Named exports, no default exports.
- Type inference for locals; explicit types for public APIs only when needed.
- No comments explaining what code does (names should be self-documenting). Comments only for non-obvious why.
- Vitest is the test runner (`pnpm test`, `pnpm test:watch`). TDD for logic-heavy modules. Co-locate tests next to source as `*.test.ts`.

## How the user wants to work

- Push back honestly when something is wrong. No flattery. Flag issues with `❗`.
- Ask with `❓` when changing course or unsure.
- French in chat, English in code/commits.
- Short commits, imperative mood, **no `Co-Authored-By` lines**.
- Don't auto-commit. Wait for explicit "commit" / "push" instruction.
- When asking multiple questions, list them, then ask one at a time.

## What's done (v1)

All v1 work is shipped on GitHub at `nicoespeon/chordgen`, branch `main`:

- TSV pipeline + Karabiner sync (build, parse, generate)
- BÉPO 1.1 keymap with dead-key support for circumflex vowels
- Finger-conflict check based on `fingers.tsv` (validated by user)
- Adaptive simultaneous threshold by chord length
- Instrumentation: per-chord shell_command logging
- `pnpm stats` reading the rotating monthly log
- `pnpm analyze` for markdown corpus → word frequency candidates
- `pnpm practice` weighted-random drill with end-of-session review of missed chords
- `pnpm sort` + simple-git-hooks pre-commit hook to keep `chords/*.tsv` alpha-sorted by output
- 79 starter chords (en, fr, dev) — user has been editing these freely

## What's open (v2 / nice-to-haves)

- **v2 modifier suffixes** — implemented and validated in vivo on Karabiner (Test 1 passing 2026-04-29). Mechanism: chord manipulators set `chordgen_pending`; Shift-tap listeners (`to_if_alone` on left + right shift) gated by `variable_if` fire the mechanical fallback or override sequence. Caret chords excluded. **Trade-off intentionally accepted**: `to_delayed_action.to_if_canceled` is left empty. Reason: Karabiner cancels the timer the moment any key is pressed, and if the cancel reset `pending=0` it raced ahead of the listener's condition evaluation, so v2 never fired. With the empty cancel, `pending` stays at -1 until the listener fires (which resets it) or the next chord overwrites it. Stale-state footgun: typing a chord, then unrelated keys, then a deliberate Shift-tap will fire v2 on the wrong context (backspace+s applied to whatever was last typed). In practice rare since tap-Shift-alone is an unusual gesture.
- **Practice improvements** the user said no to in v1 but might want later: SM-2 spaced repetition (only worth it past ~200 chords), category filter (`pnpm practice dev`), skip key, cross-session weak-chord stats.
- **`pnpm cheatsheet`** for printable chord reference — discussed but not built.
- **Pinky-aware threshold bonus** — discussed, not built. Add ms when a chord involves pinky fingers if needed.

## Hand-off note from the previous session

The mechanics work. The user has been actively editing TSV files between exchanges (chord choices are personal). Don't blindly suggest replacements without checking the current file content — `git log` and reading the actual files are authoritative. Same for `fingers.tsv`: it's been validated, treat it as ground truth.
