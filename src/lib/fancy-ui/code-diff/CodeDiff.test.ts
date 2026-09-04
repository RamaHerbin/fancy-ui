import { readFileSync } from "node:fs";
import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import CodeDiff from "./CodeDiff.svelte";
import { sound } from "../sound/sound.svelte.js";

/** One file, two hunks: 4 additions, 3 deletions, 10 line rows in total. */
const MULTI_HUNK = [
	"diff --git a/src/query.ts b/src/query.ts",
	"index 1111111..2222222 100644",
	"--- a/src/query.ts",
	"+++ b/src/query.ts",
	"@@ -10,4 +10,5 @@ export function build() {",
	"   const sql = compile(ast);",
	"-  const rows = await db.query(sql);",
	"-  return rows;",
	"+  const rows = await db.query(sql, { timeout: 5000 });",
	"+  if (rows.length === 0) return [];",
	"+  return rows.map(normalise);",
	" }",
	"@@ -30,2 +31,2 @@ export function reset() {",
	'   log("reset");',
	"-  cache.clear();",
	"+  cache.reset();",
	"",
].join("\n");

const RENAMED = [
	"diff --git a/src/old-name.ts b/src/new-name.ts",
	"similarity index 92%",
	"rename from src/old-name.ts",
	"rename to src/new-name.ts",
	"--- a/src/old-name.ts",
	"+++ b/src/new-name.ts",
	"@@ -1,2 +1,2 @@",
	'-export const name = "old";',
	'+export const name = "new";',
	" export default name;",
	"",
].join("\n");

const ADDED = [
	"diff --git a/src/added.ts b/src/added.ts",
	"new file mode 100644",
	"index 0000000..3333333",
	"--- /dev/null",
	"+++ b/src/added.ts",
	"@@ -0,0 +1,2 @@",
	"+export const answer = 42;",
	"+export default answer;",
	"",
].join("\n");

const REMOVED = [
	"diff --git a/src/gone.ts b/src/gone.ts",
	"deleted file mode 100644",
	"index 4444444..0000000",
	"--- a/src/gone.ts",
	"+++ /dev/null",
	"@@ -1,2 +0,0 @@",
	"-export const gone = true;",
	"-export default gone;",
	"",
].join("\n");

/** A hunk on its own, with no `diff --git` or `---`/`+++` above it. */
const BARE_HUNK = ["@@ -1,3 +1,3 @@", " const a = 1;", "-const b = 2;", "+const b = 3;", ""].join(
	"\n"
);

function headers(container: HTMLElement): HTMLButtonElement[] {
	return Array.from(container.querySelectorAll("button[aria-expanded]"));
}

function body(container: HTMLElement, index = 0): HTMLElement {
	const id = headers(container)[index].getAttribute("aria-controls") as string;
	return container.querySelector(`#${id}`) as HTMLElement;
}

function rowsOfKind(container: HTMLElement, kind: string): HTMLElement[] {
	return Array.from(container.querySelectorAll(`[data-kind="${kind}"]`));
}

describe("CodeDiff", () => {
	afterEach(cleanup);

	it("renders every line of a multi-hunk patch under its kind", () => {
		const { container } = render(CodeDiff, { props: { diff: MULTI_HUNK } });

		expect(rowsOfKind(container, "add")).toHaveLength(4);
		expect(rowsOfKind(container, "del")).toHaveLength(3);
		expect(rowsOfKind(container, "context")).toHaveLength(3);
		expect(rowsOfKind(container, "add")[0].className).toContain("ft-add");
		expect(rowsOfKind(container, "del")[0].className).toContain("ft-del");
		expect(rowsOfKind(container, "context")[0].className).toContain("ft-context");
	});

	it("keeps the code and drops the marker on every line", () => {
		const { container } = render(CodeDiff, { props: { diff: MULTI_HUNK } });

		const added = rowsOfKind(container, "add")[1].querySelector(".ft-code") as HTMLElement;
		expect(added.textContent).toBe("  if (rows.length === 0) return [];");
	});

	it("renders each hunk header as its own muted separator row", () => {
		const { container } = render(CodeDiff, { props: { diff: MULTI_HUNK } });

		const separators = Array.from(container.querySelectorAll(".ft-sep"));
		expect(separators).toHaveLength(2);
		expect(separators[0].textContent).toBe("@@ -10,4 +10,5 @@ export function build() {");
	});

	it("names the file and tallies the additions and deletions in the header", () => {
		const { container } = render(CodeDiff, { props: { diff: MULTI_HUNK } });

		const text = headers(container)[0].textContent as string;
		expect(text).toContain("src/query.ts");
		expect(text).toContain("+4");
		expect(text).toContain("−3");
	});

	it("prefers the filename override for a single-file patch", () => {
		const { container } = render(CodeDiff, {
			props: { diff: BARE_HUNK, filename: "scratch.ts" },
		});

		expect(headers(container)[0].textContent).toContain("scratch.ts");
	});

	it("shows both gutters with the numbers the patch declares", () => {
		const { container } = render(CodeDiff, { props: { diff: BARE_HUNK } });

		const numbers = Array.from(container.querySelectorAll(".ft-num")).map((n) => n.textContent);
		// context 1/1, deleted 2/—, added —/2.
		expect(numbers).toEqual(["1", "1", "2", "", "", "2"]);
	});

	it("drops both gutters when line numbers are off", () => {
		const { container } = render(CodeDiff, {
			props: { diff: MULTI_HUNK, lineNumbers: false },
		});

		expect(container.querySelectorAll(".ft-num")).toHaveLength(0);
		expect(rowsOfKind(container, "add")).toHaveLength(4);
	});

	it("marks the gutters, glyphs and hunk headers as chrome so a copy is code alone", () => {
		const { container } = render(CodeDiff, { props: { diff: MULTI_HUNK } });

		// jsdom does not apply the component's scoped stylesheet, so the DOM half of
		// the contract is checked here and the rule that backs it just below.
		expect(container.querySelectorAll(".ft-num").length).toBeGreaterThan(0);
		expect(container.querySelectorAll(".ft-glyph")).toHaveLength(10);
		expect(container.querySelectorAll(".ft-sep")).toHaveLength(2);

		const source = readFileSync("src/lib/fancy-ui/code-diff/CodeDiff.svelte", "utf8");
		const rule = /\.ft-num,\s*\.ft-glyph,\s*\.ft-sep\s*\{[^}]*(?<!-)user-select:\s*none/;
		expect(source).toMatch(rule);
	});

	it("carries the verdict in the glyph as well as the tint", () => {
		const { container } = render(CodeDiff, { props: { diff: BARE_HUNK } });

		const glyphs = Array.from(container.querySelectorAll(".ft-glyph")).map((g) => g.textContent);
		expect(glyphs).toEqual([" ", "−", "+"]);
	});

	it("exposes the add/del verdict to assistive tech, not just colour and glyph", () => {
		const { container, getByText } = render(CodeDiff, { props: { diff: BARE_HUNK } });

		const addRow = rowsOfKind(container, "add")[0];
		const delRow = rowsOfKind(container, "del")[0];
		expect(getByText("Added line")).toBeTruthy();
		expect(getByText("Removed line")).toBeTruthy();
		expect(addRow.textContent).toContain("Added line");
		expect(delRow.textContent).toContain("Removed line");
	});

	it("starts open, folds the body on click, and reports it through aria-expanded", async () => {
		const { container } = render(CodeDiff, { props: { diff: MULTI_HUNK } });
		expect(headers(container)[0].getAttribute("aria-expanded")).toBe("true");
		expect(body(container).inert).toBe(false);

		await fireEvent.click(headers(container)[0]);
		expect(headers(container)[0].getAttribute("aria-expanded")).toBe("false");
		// jsdom does not implement inert, so the property assignment — which is also
		// what applies inertness in a real browser — is what there is to check.
		expect(body(container).inert).toBe(true);

		await fireEvent.click(headers(container)[0]);
		expect(headers(container)[0].getAttribute("aria-expanded")).toBe("true");
	});

	it("starts folded when asked, header and stats still readable", () => {
		const { container } = render(CodeDiff, { props: { diff: MULTI_HUNK, collapsed: true } });

		expect(headers(container)[0].getAttribute("aria-expanded")).toBe("false");
		expect(headers(container)[0].textContent).toContain("+4");
	});

	it("folds one file of a patch without touching its neighbours", async () => {
		const { container } = render(CodeDiff, { props: { diff: `${ADDED}${REMOVED}` } });
		expect(headers(container)).toHaveLength(2);

		await fireEvent.click(headers(container)[0]);
		expect(headers(container)[0].getAttribute("aria-expanded")).toBe("false");
		expect(headers(container)[1].getAttribute("aria-expanded")).toBe("true");
	});

	it("does not hand a folded file's state to whatever takes its place", async () => {
		const { container, rerender } = render(CodeDiff, { props: { diff: `${ADDED}${REMOVED}` } });

		await fireEvent.click(headers(container)[0]);
		expect(headers(container)[0].getAttribute("aria-expanded")).toBe("false");

		await rerender({ diff: RENAMED });
		expect(headers(container)).toHaveLength(1);
		expect(headers(container)[0].textContent).toContain("src/old-name.ts → src/new-name.ts");
		expect(headers(container)[0].getAttribute("aria-expanded")).toBe("true");
	});

	it("starts a replacement patch open even where it reuses a file name", async () => {
		const { container, rerender } = render(CodeDiff, { props: { diff: `${ADDED}${REMOVED}` } });

		await fireEvent.click(headers(container)[0]);
		expect(headers(container)[0].getAttribute("aria-expanded")).toBe("false");

		await rerender({ diff: ADDED });
		expect(headers(container)[0].textContent).toContain("src/added.ts");
		expect(headers(container)[0].getAttribute("aria-expanded")).toBe("true");
	});

	it("re-clamps a replacement patch rather than inheriting the last expansion", async () => {
		const { container, rerender, getAllByText } = render(CodeDiff, {
			props: { diff: `${ADDED}${REMOVED}`, maxLines: 1 },
		});

		await fireEvent.click(getAllByText("Show 1 more line")[0]);
		expect(container.querySelectorAll("[data-kind]")).toHaveLength(3);

		await rerender({ diff: ADDED, maxLines: 1 });
		expect(container.querySelectorAll("[data-kind]")).toHaveLength(1);
		expect(container.textContent).toContain("Show 1 more line");
	});

	it("re-folds every file when the consumer flips the master switch", async () => {
		const { container, rerender } = render(CodeDiff, { props: { diff: `${ADDED}${REMOVED}` } });

		await fireEvent.click(headers(container)[0]);
		await rerender({ diff: `${ADDED}${REMOVED}`, collapsed: true });

		expect(headers(container).map((h) => h.getAttribute("aria-expanded"))).toEqual([
			"false",
			"false",
		]);
	});

	it("clamps a long file and offers the rest behind a button", async () => {
		const { container, getByText } = render(CodeDiff, {
			props: { diff: MULTI_HUNK, maxLines: 4 },
		});

		expect(container.querySelectorAll("[data-kind]")).toHaveLength(4);
		const more = getByText("Show 6 more lines");

		await fireEvent.click(more);
		expect(container.querySelectorAll("[data-kind]")).toHaveLength(10);
		expect(container.textContent).not.toContain("more lines");
	});

	it("never cuts the clamp on a hunk header", () => {
		const { container } = render(CodeDiff, { props: { diff: MULTI_HUNK, maxLines: 7 } });

		// Line 8 opens the second hunk, so its `@@` row must not be left dangling.
		expect(container.querySelectorAll(".ft-sep")).toHaveLength(1);
	});

	it("leaves a patch shorter than the clamp alone", () => {
		const { container } = render(CodeDiff, { props: { diff: BARE_HUNK, maxLines: 50 } });

		expect(container.querySelectorAll("[data-kind]")).toHaveLength(3);
		expect(container.textContent).not.toContain("more line");
	});

	it("renders a headerless hunk with no file name to show", () => {
		const { container } = render(CodeDiff, { props: { diff: BARE_HUNK } });

		expect(headers(container)).toHaveLength(1);
		expect(rowsOfKind(container, "add")).toHaveLength(1);
		expect(headers(container)[0].textContent).toContain("+1");
	});

	it("renders an empty shell for input that is not a patch", () => {
		const { container } = render(CodeDiff, {
			props: { diff: "nothing here resembles a unified diff" },
		});

		expect(headers(container)).toHaveLength(0);
		expect(container.querySelectorAll("[data-kind]")).toHaveLength(0);
		expect(container.firstElementChild?.getAttribute("aria-label")).toBe("Code diff");
	});

	it("renders an empty shell for an empty string", () => {
		const { container } = render(CodeDiff, { props: { diff: "" } });

		expect(headers(container)).toHaveLength(0);
	});

	it("shows a rename as old → new", () => {
		const { container } = render(CodeDiff, { props: { diff: RENAMED } });

		expect(headers(container)[0].textContent).toContain("src/old-name.ts → src/new-name.ts");
	});

	it("badges a created file and a removed one", () => {
		const { container } = render(CodeDiff, { props: { diff: `${ADDED}${REMOVED}` } });

		const badges = Array.from(container.querySelectorAll(".ft-badge")).map((b) => b.textContent);
		expect(badges).toEqual(["new file", "deleted"]);
		expect(headers(container)[0].textContent).toContain("src/added.ts");
		expect(headers(container)[1].textContent).toContain("src/gone.ts");
	});

	it("keeps a no-newline notice as a meta row", () => {
		const { container } = render(CodeDiff, {
			props: { diff: `${BARE_HUNK}\\ No newline at end of file\n` },
		});

		const meta = rowsOfKind(container, "meta");
		expect(meta).toHaveLength(1);
		expect(meta[0].className).toContain("ft-meta");
		expect(meta[0].textContent).toContain("No newline at end of file");
	});

	it("wraps long lines only when asked", async () => {
		const { container, rerender } = render(CodeDiff, { props: { diff: BARE_HUNK } });
		const scroller = () => container.querySelector(".ft-scroll") as HTMLElement;
		expect(scroller().className).not.toContain("ft-wrap");

		await rerender({ diff: BARE_HUNK, wrap: true });
		expect(scroller().className).toContain("ft-wrap");
	});

	it("merges custom classes onto the root", () => {
		const { container } = render(CodeDiff, { props: { diff: BARE_HUNK, class: "my-diff" } });

		expect((container.firstElementChild as HTMLElement).className).toContain("my-diff");
	});

	it("re-reads the patch as it grows", async () => {
		const { container, rerender } = render(CodeDiff, { props: { diff: BARE_HUNK } });
		expect(rowsOfKind(container, "add")).toHaveLength(1);

		await rerender({ diff: `${BARE_HUNK}+const c = 4;\n` });
		expect(rowsOfKind(container, "add")).toHaveLength(2);
	});

	describe("an unrelated patch that reuses a path", () => {
		// Two files on purpose: folding the only file of a one-file patch flips
		// `collapsed`, the consumer-facing master switch, and that is meant to
		// survive a replacement. What must not survive is the per-file override.
		const file = (path: string, hunk: string) =>
			[
				`diff --git a/${path} b/${path}`,
				`--- a/${path}`,
				`+++ b/${path}`,
				hunk,
				"-before",
				"+after",
			].join("\n");
		const FIRST = `${file("src/query.ts", "@@ -10,2 +10,2 @@")}\n${file("src/other.ts", "@@ -1,2 +1,2 @@")}\n`;
		const SECOND = `${file("src/query.ts", "@@ -50,2 +50,2 @@")}\n${file("src/other.ts", "@@ -1,2 +1,2 @@")}\n`;

		it("unfolds instead of inheriting the previous patch's fold state", async () => {
			const { container, rerender } = render(CodeDiff, { props: { diff: FIRST } });
			expect(headers(container)).toHaveLength(2);

			await fireEvent.click(headers(container)[0]);
			expect(headers(container)[0].getAttribute("aria-expanded")).toBe("false");

			await rerender({ diff: SECOND });
			// The reset runs in the effect that follows the prop update, so the
			// header it re-renders is a flush behind `rerender` itself.
			await tick();
			expect(headers(container)[0].getAttribute("aria-expanded")).toBe("true");
		});
	});

	describe("sound", () => {
		let play: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			play = vi.spyOn(sound, "play").mockImplementation(() => {});
		});

		afterEach(() => {
			play.mockRestore();
		});

		it("plays close exactly once when a file folds, with sound enabled", async () => {
			const { container } = render(CodeDiff, { props: { diff: MULTI_HUNK, sound: true } });

			await fireEvent.click(headers(container)[0]);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close");
		});

		it("plays open exactly once when a folded file unfolds, with sound enabled", async () => {
			const { container } = render(CodeDiff, {
				props: { diff: MULTI_HUNK, collapsed: true, sound: true },
			});

			await fireEvent.click(headers(container)[0]);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("open");
		});

		it("plays open exactly once when a clamped file reveals its remaining lines", async () => {
			const { getByText } = render(CodeDiff, {
				props: { diff: MULTI_HUNK, maxLines: 4, sound: true },
			});

			await fireEvent.click(getByText("Show 6 more lines"));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("open");
		});

		it("plays nothing by default (sound prop omitted)", async () => {
			const { container } = render(CodeDiff, { props: { diff: MULTI_HUNK } });

			await fireEvent.click(headers(container)[0]);

			expect(play).not.toHaveBeenCalled();
		});

		it("stays silent when the collapsed-prop $effect wipes the fold state, not just the click handler", async () => {
			const { rerender } = render(CodeDiff, { props: { diff: MULTI_HUNK, sound: true } });

			// Flips the master switch from outside — the $effect that resets
			// `folded` runs here, with no click involved.
			await rerender({ diff: MULTI_HUNK, collapsed: true, sound: true });

			expect(play).not.toHaveBeenCalled();
		});

		it("stays silent when a streaming patch re-runs the signature $effect", async () => {
			const { rerender } = render(CodeDiff, { props: { diff: BARE_HUNK, sound: true } });

			// Same file, more content: the signature effect resets `folded` and
			// `unclamped` on every chunk, and none of that may play a cue.
			await rerender({ diff: `${BARE_HUNK}+const c = 4;\n`, sound: true });

			expect(play).not.toHaveBeenCalled();
		});
	});
});
