# chordgen

Generates [Karabiner-Elements](https://karabiner-elements.pqrs.org/) chording rules from simple TSV chord lists.

Built for a BÉPO 1.1 layout on macOS. Each `.tsv` line declares one chord:

```
th	the
gv	gives
fct	function
```

When you press the keys producing `t` + `h` simultaneously (within 50ms), Karabiner cancels those keypresses and types `the ` instead.

## Setup

```bash
pnpm install
pnpm build
```

`pnpm build` writes the rule pack to two places:

- `dist/chordgen.json` (for inspection)
- `~/.config/karabiner/assets/complex_modifications/chordgen.json` (where Karabiner picks it up)

Then in **Karabiner-Elements → Complex Modifications → Add rule**, find "chordgen" and enable the rules.

On subsequent builds, the rule content updates automatically — Karabiner reads the file each time it reloads.

### Required setting for Keyboardio Model 100 (and other composite-HID keyboards)

In **Karabiner-Elements → Settings → Devices**, the Model 100 appears as **three entries** (it exposes three HID interfaces: keyboard-only, keyboard+pointing, pointing-only). Enable **"Modify events"** on the **keyboard+pointing** entry.

Karabiner-EventViewer shows keypresses regardless of which interface they come from, but `complex_modifications` only apply to interfaces with "Modify events" ON. The Model 100's letter keypresses arrive through the keyboard+pointing composite interface — so without this, the chord rule loads fine and the keys are visible in EventViewer, but the chord never fires (silent failure).

## Edit a chord list

```bash
chedit  # zsh alias → opens chordgen/chords in your editor
```

Add the alias to your `~/.zshrc`:

```bash
alias chedit='code ~/Development/nicoespeon/chordgen/chords && cd ~/Development/nicoespeon/chordgen'
```

## TSV format

```
chord<TAB>output
```

- `chord`: 2-4 characters, written as you type them in BÉPO. Order doesn't matter at runtime (`th` and `ht` are the same chord).
- `output`: the text to type. A trailing space is added automatically. To disable the trailing space, end the output with `^`.

Lines starting with `#` are comments. Blank lines ignored.

### Output suffix patterns

The `^` marker disables the trailing space, so you can put any literal suffix in the output:

```
the	the         → types "the "             (default trailing space)
pre	pre^        → types "pre"              (no space, useful for prefixes)
uef	useEffect(^ → types "useEffect("       (open paren, ready for args)
csl	console.^   → types "console."         (dot, ready for method)
err	error.^     → types "error."           (same idea)
```

## Files

```
chords/
├── en.tsv     English high-frequency words
├── fr.tsv     French high-frequency words
└── dev.tsv    JS/TS / dev keywords
```

Add more files (`projects.tsv`, `personal.tsv`, ...) — `build.ts` picks up everything matching `chords/*.tsv`.

## BÉPO mapping

The character → physical-key mapping is in `src/bepo-keymap.ts`, based on BÉPO 1.1 rc2 (the variant from [bepo.fr/wiki/MacOS](https://bepo.fr/wiki/MacOS)). If a chord doesn't behave as expected, the mapping is the first place to check.

## Stats

```bash
pnpm stats
```

Reports chord trigger counts for today, last 7 days, and all time.

Each chord trigger appends a line to `~/.local/share/chordgen/chordgen-YYYY-MM.log` via Karabiner's `to_after_key_up` shell hook. The hook fires after the chord keys are released, so it adds zero perceived lag on the chord output itself. Log files rotate monthly — delete old `chordgen-*.log` files when you want to forget the past.

## Analyze your writing for chord candidates

```bash
pnpm analyze ~/Downloads/notion-export
```

Scans markdown files (recursive), strips code blocks and frontmatter, counts words 4+ chars, filters out anything already chorded, and prints the top 100 candidates as TSV (frequency, word):

```
freq	word
425	function
312	through
...
```

Pipe to a file (`pnpm analyze ~/path > suggestions.tsv`), pick the words worth chording, design chord codes for them.

## Practice

```bash
pnpm practice
```

Drills your chords with weighted random selection: chords you've gotten wrong (or never seen) come up more often. Each round shows the output word, you type the chord, the script validates the typed result.

```
[12/15] Type chord for: through
> thg → outputs "through "
✓ correct (240ms)
```

History persists at `~/.local/share/chordgen/practice.jsonl` (one JSON line per attempt). Weights recompute live during a session.

Ctrl-C to quit. Session summary prints on exit.

The weighting is independent of `pnpm stats` (real-world usage frequency) — practice only cares about your accuracy in practice, not how often you actually use the word.
