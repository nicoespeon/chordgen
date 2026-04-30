# Roadmap

## v1 — chord typing (current)

Pure simultaneous-key chords. TSV → Karabiner JSON pipeline. Trailing space on output (or `^` suffix to disable).

Goal: validate that chord typing on a regular mechanical keyboard is mechanically tolerable for daily use, before investing more.

### Chord eligibility (decided 2026-04-30)

Only chords that genuinely save time over direct typing are allowed. Two hard constraints, enforced at parse time:

- **Input ≥ 3 keys.** 2-key chords collide with English/French bigrams (`on`, `ni`, `er`, `re`…) at fast typing speeds. The user types at 84 WPM; bigrams arrive in 50-80 ms, faster than any usable simultaneous-press threshold. Tightening below 25 ms made some chords physically un-fireable. The class of 2-key chords is unsalvageable.
- **Output ≥ 5 characters.** Direct typing of a 4-char word at 84 WPM costs ~280-400 ms. A chord costs ~150-300 ms cognitive recognition + ~50-100 ms execution. For short outputs the chord doesn't beat direct typing — and adds friction. The 5-char threshold is where chord-vs-type starts to clearly favour the chord.

The 2026-04-30 prune dropped 47 of the original 98 chords. What remains is the high-ROI set.

### Open questions (potential v1.x)

- **Pinky-aware threshold bonus** — discussed during v1, not built. Add ms when a chord involves pinky fingers if needed.

## v2 — modifier suffixes (designed, not implemented)

After triggering a chord, a follow-up key modifies the output. Agreed scope:

- `<chord> + Shift-tap` → pluralise — mechanical fallback `backspace + s + space`
- Skip `-ing` and past-tense modifiers: morphology too irregular in EN/FR
- TSV gets an optional 3rd column for explicit irregular plural (e.g., `chld<TAB>child<TAB>children`)
- If column empty: mechanical fallback applies; if filled: explicit override fires
- Caret chords (`^` suffix, no auto-space) are excluded from the v2 mechanism

Mechanism: each chord manipulator sets a global Karabiner state variable `chordgen_pending` (0 = none, -1 = regular, 1+ = override ID) + delayed_action to reset to 0 after 800 ms. Listener manipulators on `Shift-tap` (via `to_if_alone`) fire conditional on `chordgen_pending`'s value: one generic listener for the mechanical fallback, one per override.

## v3 — chained chord expansion (much later)

Multiple chords in sequence expand to longer text. Example:

- `web` + `ulc` → `https://understandlegacycode.com`

Honest reservation: this is essentially text expansion, and **[Espanso](https://espanso.org/)** already handles this well, multi-OS, BÉPO-friendly. If we get to v3, the right call may be to delegate to Espanso rather than re-implementing it inside chordgen — keep chord-typing and text-expansion as separate layers.
