import {
	bepoCharToKey,
	bepoCharToKeys,
	toKarabinerKey,
} from "./bepo-keymap.ts";
import type { ChordEntry } from "./parse-tsv.ts";

const THRESHOLDS_BY_CHORD_LENGTH: Record<number, number> = {
	3: 50,
	4: 80,
};
const FALLBACK_THRESHOLD_MS = 50;
const LOG_DIR = "$HOME/.local/share/chordgen";

export const V2_PENDING_VAR = "chordgen_pending";
export const V2_PENDING_REGULAR = -1;
export const V2_PENDING_NONE = 0;
export const V2_MODIFIER_WINDOW_MS = 800;

type KeyEvent = { key_code: string; modifiers?: string[] };
type ShellEvent = { shell_command: string };
type SetVariableEvent = { set_variable: { name: string; value: number } };
type ToEvent = KeyEvent | ShellEvent | SetVariableEvent;

type Condition = { type: "variable_if"; name: string; value: number };

type DelayedAction = {
	to_if_invoked: ToEvent[];
	to_if_canceled: ToEvent[];
};

type SimultaneousFrom = {
	simultaneous: Array<{ key_code: string }>;
	simultaneous_options: {
		key_down_order: "insensitive";
		key_up_order: "insensitive";
	};
	modifiers: { optional?: string[]; mandatory?: string[] };
};

type SingleKeyFrom = {
	key_code: string;
	modifiers?: { optional?: string[]; mandatory?: string[] };
};

export type Manipulator = {
	type: "basic";
	from: SimultaneousFrom | SingleKeyFrom;
	parameters?: Record<string, number>;
	conditions?: Condition[];
	to?: ToEvent[];
	to_if_alone?: ToEvent[];
	to_after_key_up?: ShellEvent[];
	to_delayed_action?: DelayedAction;
	description: string;
};

export function entryToManipulator(
	entry: ChordEntry,
	pendingValue: number | null,
): Manipulator {
	const fromKeys = [...entry.chord].map((char) => {
		const key = bepoCharToKey(char);
		if (key.shift) {
			throw new Error(
				`${entry.source}:${entry.line} — chord "${entry.chord}" requires shift on '${char}', not supported in chord input`,
			);
		}
		return { key_code: key.key_code };
	});

	const outputChars = entry.trailingSpace ? entry.output + " " : entry.output;
	const typedKeys = [...outputChars]
		.flatMap((char) => bepoCharToKeys(char))
		.map(toKarabinerKey);

	const to: ToEvent[] = [...typedKeys];
	if (pendingValue !== null) {
		to.push({ set_variable: { name: V2_PENDING_VAR, value: pendingValue } });
	}

	const parameters: Record<string, number> = {
		"basic.simultaneous_threshold_milliseconds":
			THRESHOLDS_BY_CHORD_LENGTH[entry.chord.length] ?? FALLBACK_THRESHOLD_MS,
	};
	if (pendingValue !== null) {
		parameters["basic.to_delayed_action_delay_milliseconds"] =
			V2_MODIFIER_WINDOW_MS;
	}

	const manipulator: Manipulator = {
		type: "basic",
		from: {
			simultaneous: fromKeys,
			simultaneous_options: {
				key_down_order: "insensitive",
				key_up_order: "insensitive",
			},
			modifiers: { optional: ["any"] },
		},
		parameters,
		to,
		to_after_key_up: [
			{
				shell_command: `mkdir -p "${LOG_DIR}" && echo "$(date +%s) ${entry.chord}" >> "${LOG_DIR}/chordgen-$(date +%Y-%m).log"`,
			},
		],
		description: `${entry.chord} → ${entry.output}${entry.trailingSpace ? "␣" : ""}`,
	};

	if (pendingValue !== null) {
		manipulator.to_delayed_action = {
			to_if_invoked: [
				{ set_variable: { name: V2_PENDING_VAR, value: V2_PENDING_NONE } },
			],
			to_if_canceled: [],
		};
	}

	return manipulator;
}

export function entryToShiftedManipulator(
	entry: ChordEntry,
	pendingValue: number | null,
): Manipulator {
	const fromKeys = [...entry.chord].map((char) => {
		const key = bepoCharToKey(char);
		if (key.shift) {
			throw new Error(
				`${entry.source}:${entry.line} — chord "${entry.chord}" requires shift on '${char}', not supported in chord input`,
			);
		}
		return { key_code: key.key_code };
	});

	const outputChars = entry.trailingSpace ? entry.output + " " : entry.output;
	const firstChar = outputChars.charAt(0);
	const restChars = outputChars.slice(1);

	const firstSeq = bepoCharToKeys(firstChar);
	const shiftedFirstKeys = firstSeq.map((key, idx, arr) => {
		const isBaseLetter = idx === arr.length - 1;
		return toKarabinerKey(isBaseLetter ? { ...key, shift: true } : key);
	});
	const restKeys = [...restChars]
		.flatMap((char) => bepoCharToKeys(char))
		.map(toKarabinerKey);

	const to: ToEvent[] = [...shiftedFirstKeys, ...restKeys];
	if (pendingValue !== null) {
		to.push({ set_variable: { name: V2_PENDING_VAR, value: pendingValue } });
	}

	const parameters: Record<string, number> = {
		"basic.simultaneous_threshold_milliseconds":
			THRESHOLDS_BY_CHORD_LENGTH[entry.chord.length] ?? FALLBACK_THRESHOLD_MS,
	};
	if (pendingValue !== null) {
		parameters["basic.to_delayed_action_delay_milliseconds"] =
			V2_MODIFIER_WINDOW_MS;
	}

	const capitalizedOutput =
		entry.output.charAt(0).toUpperCase() + entry.output.slice(1);
	const manipulator: Manipulator = {
		type: "basic",
		from: {
			simultaneous: fromKeys,
			simultaneous_options: {
				key_down_order: "insensitive",
				key_up_order: "insensitive",
			},
			modifiers: { mandatory: ["shift"] },
		},
		parameters,
		to,
		to_after_key_up: [
			{
				shell_command: `mkdir -p "${LOG_DIR}" && echo "$(date +%s) ${entry.chord}↑" >> "${LOG_DIR}/chordgen-$(date +%Y-%m).log"`,
			},
		],
		description: `${entry.chord} → ${capitalizedOutput}${entry.trailingSpace ? "␣" : ""} (shift)`,
	};

	if (pendingValue !== null) {
		manipulator.to_delayed_action = {
			to_if_invoked: [
				{ set_variable: { name: V2_PENDING_VAR, value: V2_PENDING_NONE } },
			],
			to_if_canceled: [],
		};
	}

	return manipulator;
}

export function mechanicalListenerManipulator(
	shift: "left_shift" | "right_shift",
): Manipulator {
	const sKey = bepoCharToKey("s");
	const spaceKey = bepoCharToKey(" ");
	return {
		type: "basic",
		from: { key_code: shift, modifiers: { optional: ["any"] } },
		conditions: [
			{ type: "variable_if", name: V2_PENDING_VAR, value: V2_PENDING_REGULAR },
		],
		to: [{ key_code: shift }],
		to_if_alone: [
			{ key_code: "delete_or_backspace" },
			{ key_code: sKey.key_code },
			{ key_code: spaceKey.key_code },
			{ set_variable: { name: V2_PENDING_VAR, value: V2_PENDING_NONE } },
		],
		description: `chordgen v2 mechanical fallback (${shift})`,
	};
}

export function overrideListenerManipulator(
	entry: ChordEntry,
	pendingValue: number,
	shift: "left_shift" | "right_shift",
): Manipulator {
	if (!entry.pluralOverride) {
		throw new Error(
			`overrideListenerManipulator called for chord "${entry.chord}" without pluralOverride`,
		);
	}

	const backspaceCount = entry.output.length + (entry.trailingSpace ? 1 : 0);
	const backspaces: ToEvent[] = Array.from({ length: backspaceCount }, () => ({
		key_code: "delete_or_backspace",
	}));

	const overrideKeys = [...entry.pluralOverride]
		.flatMap((char) => bepoCharToKeys(char))
		.map(toKarabinerKey);

	const spaceKey = bepoCharToKey(" ");

	return {
		type: "basic",
		from: { key_code: shift, modifiers: { optional: ["any"] } },
		conditions: [
			{ type: "variable_if", name: V2_PENDING_VAR, value: pendingValue },
		],
		to: [{ key_code: shift }],
		to_if_alone: [
			...backspaces,
			...overrideKeys,
			{ key_code: spaceKey.key_code },
			{ set_variable: { name: V2_PENDING_VAR, value: V2_PENDING_NONE } },
		],
		description: `chordgen v2 override ${entry.chord} → ${entry.pluralOverride} (${shift})`,
	};
}
