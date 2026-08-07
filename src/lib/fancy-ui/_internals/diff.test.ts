import { describe, it, expect } from "vitest";
import { parseUnifiedDiff } from "./diff.js";

const FULL_DIFF = [
	"diff --git a/src/alpha.ts b/src/alpha.ts",
	"index 1234567..89abcde 100644",
	"--- a/src/alpha.ts",
	"+++ b/src/alpha.ts",
	"@@ -1,4 +1,5 @@ export function alpha()",
	" const a = 1;",
	"-const b = 2;",
	"+const b = 3;",
	"+const c = 4;",
	" const d = 5;",
	" return a;",
	"@@ -20,2 +21,2 @@",
	" tail one",
	"-tail two",
	"+tail 2",
	"diff --git a/src/beta.ts b/src/beta.ts",
	"index aaaaaaa..bbbbbbb 100644",
	"--- a/src/beta.ts",
	"+++ b/src/beta.ts",
	"@@ -7 +7 @@",
	"-old beta",
	"+new beta",
	"",
].join("\n");

describe("parseUnifiedDiff — complete git patch", () => {
	it("splits on file boundaries and strips the a/ b/ prefixes", () => {
		const files = parseUnifiedDiff(FULL_DIFF);
		expect(files).toHaveLength(2);
		expect(files.map((f) => f.newPath)).toEqual(["src/alpha.ts", "src/beta.ts"]);
		expect(files[0].oldPath).toBe("src/alpha.ts");
		expect(files[0].isNew).toBe(false);
		expect(files[0].isDeleted).toBe(false);
		expect(files[0].isRename).toBe(false);
	});

	it("tallies additions and deletions per file", () => {
		const [alpha, beta] = parseUnifiedDiff(FULL_DIFF);
		expect(alpha.hunks).toHaveLength(2);
		expect(alpha.additions).toBe(3);
		expect(alpha.deletions).toBe(2);
		expect(beta.hunks).toHaveLength(1);
		expect(beta.additions).toBe(1);
		expect(beta.deletions).toBe(1);
	});

	it("keeps the hunk header and its parsed ranges", () => {
		const [alpha] = parseUnifiedDiff(FULL_DIFF);
		const hunk = alpha.hunks[0];
		expect(hunk.header).toBe("@@ -1,4 +1,5 @@ export function alpha()");
		expect([hunk.oldStart, hunk.oldCount, hunk.newStart, hunk.newCount]).toEqual([1, 4, 1, 5]);
	});

	it("numbers each line on the side where it exists", () => {
		const [alpha] = parseUnifiedDiff(FULL_DIFF);
		const numbered = alpha.hunks[0].lines.map((l) => [l.type, l.oldLine, l.newLine, l.text]);
		expect(numbered).toEqual([
			["context", 1, 1, "const a = 1;"],
			["del", 2, null, "const b = 2;"],
			["add", null, 2, "const b = 3;"],
			["add", null, 3, "const c = 4;"],
			["context", 3, 4, "const d = 5;"],
			["context", 4, 5, "return a;"],
		]);
	});

	it("restarts numbering from the second hunk's ranges", () => {
		const [alpha] = parseUnifiedDiff(FULL_DIFF);
		expect(alpha.hunks[1].lines.map((l) => [l.oldLine, l.newLine])).toEqual([
			[20, 21],
			[21, null],
			[null, 22],
		]);
	});
});

describe("parseUnifiedDiff — file status", () => {
	it("flags a new file and nulls its old path", () => {
		const [file] = parseUnifiedDiff(
			[
				"diff --git a/src/new.ts b/src/new.ts",
				"new file mode 100644",
				"--- /dev/null",
				"+++ b/src/new.ts",
				"@@ -0,0 +1,2 @@",
				"+line one",
				"+line two",
			].join("\n")
		);
		expect(file.isNew).toBe(true);
		expect(file.isDeleted).toBe(false);
		expect(file.oldPath).toBeNull();
		expect(file.newPath).toBe("src/new.ts");
		expect([file.additions, file.deletions]).toEqual([2, 0]);
		expect(file.hunks[0].lines.map((l) => l.newLine)).toEqual([1, 2]);
	});

	it("flags a deleted file and nulls its new path", () => {
		const [file] = parseUnifiedDiff(
			[
				"diff --git a/src/gone.ts b/src/gone.ts",
				"deleted file mode 100644",
				"--- a/src/gone.ts",
				"+++ /dev/null",
				"@@ -1,2 +0,0 @@",
				"-line one",
				"-line two",
			].join("\n")
		);
		expect(file.isDeleted).toBe(true);
		expect(file.isNew).toBe(false);
		expect(file.oldPath).toBe("src/gone.ts");
		expect(file.newPath).toBeNull();
		expect([file.additions, file.deletions]).toEqual([0, 2]);
	});

	it("nulls the old path of a binary add, which carries no /dev/null header", () => {
		const [file] = parseUnifiedDiff(
			[
				"diff --git a/assets/logo.png b/assets/logo.png",
				"new file mode 100644",
				"index 0000000..7c1b2f9",
				"GIT binary patch",
				"literal 2048",
			].join("\n")
		);
		expect(file.isNew).toBe(true);
		expect(file.oldPath).toBeNull();
		expect(file.newPath).toBe("assets/logo.png");
	});

	it("nulls the new path of a binary delete for the same reason", () => {
		const [file] = parseUnifiedDiff(
			[
				"diff --git a/assets/old.png b/assets/old.png",
				"deleted file mode 100644",
				"index 7c1b2f9..0000000",
				"GIT binary patch",
				"literal 0",
			].join("\n")
		);
		expect(file.isDeleted).toBe(true);
		expect(file.oldPath).toBe("assets/old.png");
		expect(file.newPath).toBeNull();
	});

	it("detects a rename and reads both paths from the rename lines", () => {
		const [file] = parseUnifiedDiff(
			[
				"diff --git a/src/old-name.ts b/src/new-name.ts",
				"similarity index 92%",
				"rename from src/old-name.ts",
				"rename to src/new-name.ts",
				"--- a/src/old-name.ts",
				"+++ b/src/new-name.ts",
				"@@ -1 +1 @@",
				'-const name = "old";',
				'+const name = "new";',
			].join("\n")
		);
		expect(file.isRename).toBe(true);
		expect(file.oldPath).toBe("src/old-name.ts");
		expect(file.newPath).toBe("src/new-name.ts");
	});
});

describe("parseUnifiedDiff — tolerant parsing", () => {
	it("synthesizes a pathless file for a bare hunk", () => {
		const files = parseUnifiedDiff(["@@ -10,3 +10,3 @@", " keep", "-drop", "+gain"].join("\n"));
		expect(files).toHaveLength(1);
		expect(files[0].oldPath).toBeNull();
		expect(files[0].newPath).toBeNull();
		expect(files[0].hunks[0].lines.map((l) => [l.type, l.oldLine, l.newLine])).toEqual([
			["context", 10, 10],
			["del", 11, null],
			["add", null, 11],
		]);
	});

	it("starts the next file at bare ---/+++ headers once the hunk counts are spent", () => {
		// `diff -u one.txt two.txt` concatenated: no `diff --git` separator, so the
		// second file announces itself with headers that look like body lines.
		const files = parseUnifiedDiff(
			[
				"--- one.txt",
				"+++ one.txt",
				"@@ -1,2 +1,2 @@",
				" keep",
				"-old one",
				"+new one",
				"--- two.txt",
				"+++ two.txt",
				"@@ -1 +1 @@",
				"-old two",
				"+new two",
			].join("\n")
		);
		expect(files).toHaveLength(2);
		expect(files.map((f) => f.newPath)).toEqual(["one.txt", "two.txt"]);
		expect(files.map((f) => f.hunks.length)).toEqual([1, 1]);
		expect(files.map((f) => [f.additions, f.deletions])).toEqual([
			[1, 1],
			[1, 1],
		]);
	});

	it("synthesizes a hunk for bare body lines with no header at all", () => {
		const files = parseUnifiedDiff([" untouched", "-removed", "+inserted"].join("\n"));
		expect(files).toHaveLength(1);
		expect(files[0].hunks).toHaveLength(1);
		expect(files[0].hunks[0].header).toBe("");
		expect(files[0].hunks[0].lines.map((l) => [l.type, l.oldLine, l.newLine])).toEqual([
			["context", 1, 1],
			["del", 2, null],
			["add", null, 2],
		]);
		expect([files[0].additions, files[0].deletions]).toEqual([1, 1]);
	});

	it("defaults an omitted range count to 1", () => {
		const [file] = parseUnifiedDiff(
			["@@ -3 +3,2 @@", "-only old", "+new one", "+new two"].join("\n")
		);
		const hunk = file.hunks[0];
		expect([hunk.oldStart, hunk.oldCount, hunk.newStart, hunk.newCount]).toEqual([3, 1, 3, 2]);
		expect(hunk.lines.map((l) => [l.oldLine, l.newLine])).toEqual([
			[3, null],
			[null, 3],
			[null, 4],
		]);
	});

	it("treats the no-newline marker as meta without bumping line numbers", () => {
		const [file] = parseUnifiedDiff(
			[
				"@@ -1,2 +1,2 @@",
				" alpha",
				"-beta",
				"\\ No newline at end of file",
				"+beta!",
				"\\ No newline at end of file",
			].join("\n")
		);
		const lines = file.hunks[0].lines;
		expect(lines.map((l) => l.type)).toEqual(["context", "del", "meta", "add", "meta"]);
		expect(lines[2]).toEqual({
			type: "meta",
			text: "\\ No newline at end of file",
			oldLine: null,
			newLine: null,
		});
		expect(lines[3].newLine).toBe(2);
		expect([file.additions, file.deletions]).toEqual([1, 1]);
	});

	it("treats unknown lines inside a hunk as context", () => {
		const [file] = parseUnifiedDiff(["@@ -1,2 +1,2 @@", "no marker here", " tail"].join("\n"));
		expect(file.hunks[0].lines[0]).toEqual({
			type: "context",
			text: "no marker here",
			oldLine: 1,
			newLine: 1,
		});
	});

	it("parses a patch that is still truncated mid-hunk", () => {
		const files = parseUnifiedDiff(
			["diff --git a/x.ts b/x.ts", "--- a/x.ts", "+++ b/x.ts", "@@ -1,3 +1,3 @@", " c"].join("\n")
		);
		expect(files).toHaveLength(1);
		expect(files[0].newPath).toBe("x.ts");
		expect(files[0].hunks[0].lines).toHaveLength(1);
	});

	it("handles CRLF line endings", () => {
		const [file] = parseUnifiedDiff("@@ -1 +1 @@\r\n-old\r\n+new\r\n");
		expect(file.hunks[0].lines.map((l) => l.text)).toEqual(["old", "new"]);
	});
});

describe("parseUnifiedDiff — degenerate input", () => {
	it("returns an empty array for empty or whitespace input", () => {
		expect(parseUnifiedDiff("")).toEqual([]);
		expect(parseUnifiedDiff("   \n\t\n")).toEqual([]);
	});

	it("never throws on garbage and reports no files", () => {
		const garbage = 'this is not a diff\nrandom { json: 1 }\n=== nope ===\n@@ broken @@\n"""';
		expect(() => parseUnifiedDiff(garbage)).not.toThrow();
		expect(parseUnifiedDiff(garbage)).toEqual([]);
	});

	it("never throws on non-string input", () => {
		expect(() => parseUnifiedDiff(undefined as unknown as string)).not.toThrow();
		expect(parseUnifiedDiff(null as unknown as string)).toEqual([]);
	});
});
