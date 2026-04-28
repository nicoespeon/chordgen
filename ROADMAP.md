# Roadmap

## v1 — chord typing (current)

Pure simultaneous-key chords. TSV → Karabiner JSON pipeline. Trailing space on output (or `^` suffix to disable).

Goal: validate that chord typing on a regular mechanical keyboard is mechanically tolerable for daily use, before investing more.

## v2 — modifier suffixes (after v1 feels right)

After triggering a chord, a follow-up key modifies the output. Examples:

- `<chord> + ;` → pluralise (`fct → functions`)
- `<chord> + ,` → "-ing" (`go → going`)
- `<chord> + .` → past tense (`type → typed`)

Mechanism: Karabiner state variable set when a chord fires, consumed by the next keypress within ~500ms.

## v3 — chained chord expansion (much later)

Multiple chords in sequence expand to longer text. Example:

- `web` + `ulc` → `https://understandlegacycode.com`

Honest reservation: this is essentially text expansion, and **[Espanso](https://espanso.org/)** already handles this well, multi-OS, BÉPO-friendly. If we get to v3, the right call may be to delegate to Espanso rather than re-implementing it inside chordgen — keep chord-typing and text-expansion as separate layers.
