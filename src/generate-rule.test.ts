import { describe, expect, it } from "vitest";
import {
	entryToManipulator,
	entryToShiftedManipulator,
	mechanicalListenerManipulator,
	overrideListenerManipulator,
	V2_PENDING_REGULAR,
	V2_PENDING_VAR,
	V2_MODIFIER_WINDOW_MS,
} from "./generate-rule.ts";
import type { ChordEntry } from "./parse-tsv.ts";

const baseEntry: ChordEntry = {
	chord: "at",
	output: "and",
	trailingSpace: true,
	pluralOverride: undefined,
	source: "en.tsv",
	line: 1,
};

const caretEntry: ChordEntry = {
	chord: "at",
	output: "and(",
	trailingSpace: false,
	pluralOverride: undefined,
	source: "dev.tsv",
	line: 2,
};

describe("entryToManipulator", () => {
	it("emits a chord manipulator without v2 fields when pendingValue is null", () => {
		const mani = entryToManipulator(baseEntry, null);

		expect(mani.to).not.toContainEqual(
			expect.objectContaining({ set_variable: expect.anything() }),
		);
		expect(mani.to_delayed_action).toBeUndefined();
	});

	it("appends set_variable=-1 and to_delayed_action when pendingValue is V2_PENDING_REGULAR", () => {
		const mani = entryToManipulator(baseEntry, V2_PENDING_REGULAR);

		expect(mani.to).toContainEqual({
			set_variable: { name: V2_PENDING_VAR, value: V2_PENDING_REGULAR },
		});
		expect(mani.to_delayed_action).toMatchObject({
			to_if_invoked: [
				{ set_variable: { name: V2_PENDING_VAR, value: 0 } },
			],
			to_if_canceled: [],
		});
		expect(mani.parameters).toMatchObject({
			"basic.to_delayed_action_delay_milliseconds": V2_MODIFIER_WINDOW_MS,
		});
	});

	it("uses positive pending value for chords with override (e.g. ID 5)", () => {
		const mani = entryToManipulator(baseEntry, 5);

		expect(mani.to).toContainEqual({
			set_variable: { name: V2_PENDING_VAR, value: 5 },
		});
	});

	it("does not add v2 fields to a caret chord even if forced (caller's responsibility)", () => {
		const mani = entryToManipulator(caretEntry, null);

		expect(mani.to).not.toContainEqual(
			expect.objectContaining({ set_variable: expect.anything() }),
		);
		expect(mani.to_delayed_action).toBeUndefined();
	});
});

describe("mechanicalListenerManipulator", () => {
	it("emits a Shift-tap listener that types backspace + s + space when pending == -1", () => {
		const mani = mechanicalListenerManipulator("left_shift");

		expect(mani).toMatchObject({
			type: "basic",
			from: { key_code: "left_shift" },
			to: [{ key_code: "left_shift" }],
			conditions: [
				{
					type: "variable_if",
					name: V2_PENDING_VAR,
					value: V2_PENDING_REGULAR,
				},
			],
		});
		expect(mani.to_if_alone).toEqual([
			{ key_code: "delete_or_backspace" },
			{ key_code: "k" },
			{ key_code: "spacebar" },
			{ set_variable: { name: V2_PENDING_VAR, value: 0 } },
		]);
	});

	it("supports right_shift symmetrically", () => {
		const mani = mechanicalListenerManipulator("right_shift");

		expect(mani).toMatchObject({
			from: { key_code: "right_shift" },
			to: [{ key_code: "right_shift" }],
		});
	});
});

describe("overrideListenerManipulator", () => {
	it("emits backspace × (output.length + 1), then types the override + space, then resets pending", () => {
		const entry: ChordEntry = {
			...baseEntry,
			output: "child",
			pluralOverride: "children",
		};
		const mani = overrideListenerManipulator(entry, 1, "left_shift");

		const backspaces = (mani.to_if_alone ?? []).filter(
			(e) => "key_code" in e && e.key_code === "delete_or_backspace",
		);
		expect(backspaces).toHaveLength("child".length + 1);

		expect(mani.conditions).toEqual([
			{ type: "variable_if", name: V2_PENDING_VAR, value: 1 },
		]);

		const last = mani.to_if_alone?.[mani.to_if_alone.length - 1];
		expect(last).toEqual({
			set_variable: { name: V2_PENDING_VAR, value: 0 },
		});
	});

	it("types the override using BÉPO keymap (children = c h i l d r e n)", () => {
		const entry: ChordEntry = {
			...baseEntry,
			output: "child",
			pluralOverride: "children",
		};
		const mani = overrideListenerManipulator(entry, 1, "left_shift");

		const seq = mani.to_if_alone ?? [];
		const typedKeys = seq
			.slice(
				"child".length + 1,
				seq.length - 2,
			)
			.map((e) => ("key_code" in e ? e.key_code : null));

		expect(typedKeys).toEqual([
			"h", "period", "d", "o", "i", "l", "f", "semicolon",
		]);
	});
});

describe("entryToShiftedManipulator", () => {
	const thoseEntry: ChordEntry = {
		chord: "tho",
		output: "those",
		trailingSpace: true,
		pluralOverride: undefined,
		source: "en.tsv",
		line: 1,
	};

	it("requires shift as a mandatory modifier", () => {
		const mani = entryToShiftedManipulator(thoseEntry, V2_PENDING_REGULAR);

		expect(mani.from).toMatchObject({
			modifiers: { mandatory: ["shift"] },
		});
	});

	it("capitalizes only the first character of the output", () => {
		const mani = entryToShiftedManipulator(thoseEntry, V2_PENDING_REGULAR);

		const keyEvents = (mani.to ?? []).filter((e) => "key_code" in e);
		const firstKey = keyEvents[0];
		const restKeys = keyEvents.slice(1, "those".length + 1);

		expect(firstKey).toEqual({ key_code: "j", modifiers: ["left_shift"] });
		expect(restKeys.every((k) => !("modifiers" in k && k.modifiers))).toBe(true);
	});

	it("preserves v2 set_variable + delayed_action when pendingValue is provided", () => {
		const mani = entryToShiftedManipulator(thoseEntry, V2_PENDING_REGULAR);

		expect(mani.to).toContainEqual({
			set_variable: { name: V2_PENDING_VAR, value: V2_PENDING_REGULAR },
		});
		expect(mani.to_delayed_action).toMatchObject({
			to_if_invoked: [{ set_variable: { name: V2_PENDING_VAR, value: 0 } }],
		});
		expect(mani.parameters).toMatchObject({
			"basic.to_delayed_action_delay_milliseconds": V2_MODIFIER_WINDOW_MS,
		});
	});

	it("emits no v2 fields when pendingValue is null (caret chord case)", () => {
		const caretEntry: ChordEntry = {
			...thoseEntry,
			output: "console.",
			trailingSpace: false,
		};
		const mani = entryToShiftedManipulator(caretEntry, null);

		expect(mani.to).not.toContainEqual(
			expect.objectContaining({ set_variable: expect.anything() }),
		);
		expect(mani.to_delayed_action).toBeUndefined();
	});

	it("capitalizes the BASE letter of a composed first character (ê → Ê)", () => {
		const etreEntry: ChordEntry = {
			...thoseEntry,
			chord: "etr",
			output: "êtres",
		};
		const mani = entryToShiftedManipulator(etreEntry, V2_PENDING_REGULAR);

		const keyEvents = (mani.to ?? []).filter((e) => "key_code" in e);
		expect(keyEvents[0]).toEqual({ key_code: "y" });
		expect(keyEvents[1]).toEqual({ key_code: "f", modifiers: ["left_shift"] });
	});
});
