# Roadmap

## v1 — chord typing (current)

Pure simultaneous-key chords. TSV → Karabiner JSON pipeline. Trailing space on output (or `^` suffix to disable).

Goal: validate that chord typing on a regular mechanical keyboard is mechanically tolerable for daily use, before investing more.

## v2 — modifier suffixes (designed, not implemented)

After triggering a chord, a follow-up key modifies the output. Agreed scope (narrowed during design):

- `<chord> + ;` → pluralise — mechanical fallback `backspace + s + space`
- Skip `,` (-ing) and `.` (past) mechanical: morphology too irregular in EN/FR
- TSV gets an optional 3rd column for explicit plural override (e.g., `mke<TAB>make<TAB>made`)
- If column empty: mechanical fallback applies; if filled: explicit override fires

Mechanism: each chord manipulator sets a Karabiner state variable + delayed_action to reset it after ~500ms. A listener manipulator on `;` fires when the variable is set. For chords with explicit override, the listener uses chord-specific output instead of mechanical.

## v3 — chained chord expansion (much later)

Multiple chords in sequence expand to longer text. Example:

- `web` + `ulc` → `https://understandlegacycode.com`

Honest reservation: this is essentially text expansion, and **[Espanso](https://espanso.org/)** already handles this well, multi-OS, BÉPO-friendly. If we get to v3, the right call may be to delegate to Espanso rather than re-implementing it inside chordgen — keep chord-typing and text-expansion as separate layers.
