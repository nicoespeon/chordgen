import { describe, expect, it } from "vitest";
import { sortContent } from "./sort.ts";

describe("sortContent", () => {
	it("returns empty string for empty input", () => {
		expect(sortContent("")).toBe("");
	});

	it("preserves header-only files unchanged", () => {
		const input = "# Header line 1\n# Header line 2\n";
		expect(sortContent(input)).toBe(input);
	});

	it("sorts data lines alphabetically by output (column 2)", () => {
		const input = "th\tthe\nan\tand\nar\tare\n";
		const expected = "an\tand\nar\tare\nth\tthe\n";
		expect(sortContent(input)).toBe(expected);
	});

	it("preserves header (comments + blank line) before sorting data", () => {
		const input = "# header\n\nth\tthe\nan\tand\n";
		const expected = "# header\n\nan\tand\nth\tthe\n";
		expect(sortContent(input)).toBe(expected);
	});

	it("treats interleaved comments as section delimiters and sorts each section independently", () => {
		const input = [
			"# english",
			"th\tthe",
			"an\tand",
			"# dev",
			"cs\tconst",
			"ary\tarray",
			"",
		].join("\n");
		const expected = [
			"# english",
			"an\tand",
			"th\tthe",
			"# dev",
			"ary\tarray",
			"cs\tconst",
			"",
		].join("\n");
		expect(sortContent(input)).toBe(expected);
	});

	it("preserves the order of sections themselves (does not sort sections)", () => {
		const input = [
			"# zebra section",
			"b\tbanana",
			"# apple section",
			"a\tapricot",
			"",
		].join("\n");
		expect(sortContent(input)).toBe(input);
	});

	it("preserves trailing newline if present", () => {
		expect(sortContent("th\tthe\n")).toBe("th\tthe\n");
	});

	it("does not add trailing newline if absent", () => {
		expect(sortContent("th\tthe")).toBe("th\tthe");
	});

	it("drops blank lines within a data block", () => {
		const input = "th\tthe\n\nan\tand\n";
		expect(sortContent(input)).toBe("an\tand\nth\tthe\n");
	});

	it("preserves blank lines in section prefix (between comments and first data line)", () => {
		const input = "# header\n\n\nth\tthe\n";
		expect(sortContent(input)).toBe("# header\n\n\nth\tthe\n");
	});

	it("handles a file with no header (data only)", () => {
		const input = "th\tthe\nan\tand\n";
		expect(sortContent(input)).toBe("an\tand\nth\tthe\n");
	});

	it("uses output (col 2) as sort key, not chord (col 1)", () => {
		const input = "zz\tapple\naa\tzebra\n";
		expect(sortContent(input)).toBe("zz\tapple\naa\tzebra\n");
	});

	it("sorts French outputs deterministically", () => {
		const input = "etr\têtre\nav\tavec\nda\tdans\n";
		expect(sortContent(input)).toBe("av\tavec\nda\tdans\netr\têtre\n");
	});

	it("preserves rows that have a trailing-space-disabling caret", () => {
		const input = "uef\tuseEffect(^\nucb\tuseCallback(^\n";
		expect(sortContent(input)).toBe(
			"ucb\tuseCallback(^\nuef\tuseEffect(^\n",
		);
	});

	it("preserves output that contains spaces (multi-word)", () => {
		const input = "pq\tpourquoi\npc\tparce que\n";
		expect(sortContent(input)).toBe("pc\tparce que\npq\tpourquoi\n");
	});

	it("preserves blank line between a data block and the next section's comment header", () => {
		const input = "a\tapple\n\n# section 2\nb\tbanana\n";
		expect(sortContent(input)).toBe(input);
	});
});
