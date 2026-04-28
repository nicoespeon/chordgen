// BÉPO 1.1 rc2 (the bepo.fr/wiki/MacOS variant) → Karabiner physical key_codes.
//
// To produce a BÉPO character on macOS, Karabiner needs to send the physical
// key event that, under the active BÉPO layout, produces that character.
// This file is the lookup table.
//
// If a chord misbehaves, this is the first place to check. Each line maps
// a BÉPO character (what the user types or wants typed) to the physical
// key on a US-QWERTY-shaped keyboard, with optional shift state.

export type PhysicalKey = {
  key_code: string;
  shift?: boolean;
};

const bepoToPhysical: Record<string, PhysicalKey> = {
  // ─── Letters (top letter row, QWERTY q–]) ───────────────────────────────
  b: { key_code: "q" },
  é: { key_code: "w" },
  p: { key_code: "e" },
  o: { key_code: "r" },
  è: { key_code: "t" },
  v: { key_code: "u" },
  d: { key_code: "i" },
  l: { key_code: "o" },
  j: { key_code: "p" },
  z: { key_code: "open_bracket" },
  w: { key_code: "close_bracket" },

  // ─── Letters (home row, QWERTY a–') ─────────────────────────────────────
  a: { key_code: "a" },
  u: { key_code: "s" },
  i: { key_code: "d" },
  e: { key_code: "f" },
  c: { key_code: "h" },
  t: { key_code: "j" },
  s: { key_code: "k" },
  r: { key_code: "l" },
  n: { key_code: "semicolon" },
  m: { key_code: "quote" },

  // ─── Letters (bottom row, QWERTY z–/) ───────────────────────────────────
  à: { key_code: "z" },
  y: { key_code: "x" },
  x: { key_code: "c" },
  k: { key_code: "b" },
  q: { key_code: "m" },
  g: { key_code: "comma" },
  h: { key_code: "period" },
  f: { key_code: "slash" },

  // ─── Digits (number row, BÉPO needs shift to produce digits) ────────────
  "1": { key_code: "1", shift: true },
  "2": { key_code: "2", shift: true },
  "3": { key_code: "3", shift: true },
  "4": { key_code: "4", shift: true },
  "5": { key_code: "5", shift: true },
  "6": { key_code: "6", shift: true },
  "7": { key_code: "7", shift: true },
  "8": { key_code: "8", shift: true },
  "9": { key_code: "9", shift: true },
  "0": { key_code: "0", shift: true },

  // ─── Punctuation (unshifted positions in BÉPO 1.1) ──────────────────────
  ",": { key_code: "g" },
  ".": { key_code: "v" },
  "'": { key_code: "n" },
  " ": { key_code: "spacebar" },

  // ─── Punctuation reachable without modifiers (number row unshifted) ─────
  $: { key_code: "grave_accent_and_tilde" },
  "(": { key_code: "4" },
  ")": { key_code: "5" },
  "@": { key_code: "6" },
  "+": { key_code: "7" },
  "-": { key_code: "8" },
  "/": { key_code: "9" },
  "*": { key_code: "0" },
  "=": { key_code: "hyphen" },
  "%": { key_code: "equal_sign" },
};

// Dead-key composed characters: typed as (dead key) + (base letter).
// In BÉPO 1.1, the circumflex dead key is on QWERTY-y position.
const CIRCUMFLEX_DEAD_KEY: PhysicalKey = { key_code: "y" };

const bepoComposed: Record<string, PhysicalKey[]> = {
  ê: [CIRCUMFLEX_DEAD_KEY, bepoToPhysical.e!],
  â: [CIRCUMFLEX_DEAD_KEY, bepoToPhysical.a!],
  î: [CIRCUMFLEX_DEAD_KEY, bepoToPhysical.i!],
  ô: [CIRCUMFLEX_DEAD_KEY, bepoToPhysical.o!],
  û: [CIRCUMFLEX_DEAD_KEY, bepoToPhysical.u!],
};

export function bepoCharToKey(char: string): PhysicalKey {
  const sequence = bepoCharToKeys(char);
  if (sequence.length !== 1) {
    throw new Error(
      `Character '${char}' requires multiple physical keys; not allowed in chord input`,
    );
  }
  return sequence[0]!;
}

export function bepoCharToKeys(char: string): PhysicalKey[] {
  if (isUpperCaseLetter(char)) {
    const lower = bepoToPhysical[char.toLowerCase()];
    if (!lower) throw new Error(`Unknown BÉPO character: '${char}'`);
    return [{ ...lower, shift: true }];
  }

  const composed = bepoComposed[char];
  if (composed) return composed;

  const mapping = bepoToPhysical[char];
  if (!mapping) throw new Error(`Unknown BÉPO character: '${char}'`);
  return [mapping];
}

export function toKarabinerKey(key: PhysicalKey): {
  key_code: string;
  modifiers?: string[];
} {
  if (key.shift) {
    return { key_code: key.key_code, modifiers: ["left_shift"] };
  }
  return { key_code: key.key_code };
}

function isUpperCaseLetter(char: string): boolean {
  return char.length === 1 && char >= "A" && char <= "Z";
}
