import { describe, expect, it } from "vitest";
import { parseTsvContent } from "./parse-tsv.ts";

describe("parseTsvContent", () => {
	it("parses a regular 2-column entry", () => {
		const { entries, errors } = parseTsvContent("th\tthe\n", "en.tsv");

		expect(errors).toEqual([]);
		expect(entries).toEqual([
			{
				chord: "th",
				output: "the",
				trailingSpace: true,
				pluralOverride: undefined,
				source: "en.tsv",
				line: 1,
			},
		]);
	});

	it("parses a chord with caret-suffix (no auto-space)", () => {
		const { entries, errors } = parseTsvContent("uef\tuseEffect(^\n", "dev.tsv");

		expect(errors).toEqual([]);
		expect(entries[0]).toMatchObject({
			chord: "uef",
			output: "useEffect(",
			trailingSpace: false,
		});
	});

	it("skips comments and blank lines", () => {
		const { entries, errors } = parseTsvContent(
			"# header\n\nth\tthe\n",
			"en.tsv",
		);

		expect(errors).toEqual([]);
		expect(entries).toHaveLength(1);
	});

	it("parses a 3-column entry with irregular plural override", () => {
		const { entries, errors } = parseTsvContent(
			"chd\tchild\tchildren\n",
			"en.tsv",
		);

		expect(errors).toEqual([]);
		expect(entries[0]).toMatchObject({
			chord: "chd",
			output: "child",
			trailingSpace: true,
			pluralOverride: "children",
		});
	});

	it("rejects a caret chord with a 3rd column (caret chords are excluded from v2)", () => {
		const { entries, errors } = parseTsvContent(
			"cnl\tconsole.^\tnonsense\n",
			"dev.tsv",
		);

		expect(entries).toEqual([]);
		expect(errors[0]).toMatch(/caret chord.*cannot have a plural column/i);
	});

	it("rejects an empty 3rd column", () => {
		const { entries, errors } = parseTsvContent("chd\tchild\t\n", "en.tsv");

		expect(entries).toEqual([]);
		expect(errors[0]).toMatch(/empty plural override/i);
	});

	it("rejects a chord that is too short", () => {
		const { entries, errors } = parseTsvContent("a\tand\n", "en.tsv");

		expect(entries).toEqual([]);
		expect(errors[0]).toMatch(/2-4 keys/);
	});

	it("rejects a chord with duplicate keys", () => {
		const { entries, errors } = parseTsvContent("aa\tand\n", "en.tsv");

		expect(entries).toEqual([]);
		expect(errors[0]).toMatch(/duplicate keys/);
	});

	it("preserves multi-word output (e.g. parce que)", () => {
		const { entries, errors } = parseTsvContent("pc\tparce que\n", "fr.tsv");

		expect(errors).toEqual([]);
		expect(entries[0]?.output).toBe("parce que");
	});
});
