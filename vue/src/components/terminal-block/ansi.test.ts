import { describe, it, expect } from "vitest";
import { parseAnsi, type AnsiSegment } from "./ansi.js";

const ESC = "\u001b";
const BEL = "\u0007";

/** Everything a reader would actually see, escapes removed. */
function plain(segments: AnsiSegment[]): string {
	return segments.map((s) => s.text).join("");
}

describe("parseAnsi", () => {
	it("returns a single unstyled segment for text with no escapes", () => {
		expect(parseAnsi("npm install")).toEqual([{ text: "npm install", bold: false, fg: null }]);
	});

	it("returns nothing for an empty string", () => {
		expect(parseAnsi("")).toEqual([]);
	});

	it("maps the eight foreground codes onto their CSS variables", () => {
		const names = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"];
		names.forEach((name, i) => {
			const segments = parseAnsi(`${ESC}[${30 + i}mx`);
			expect(segments).toEqual([{ text: "x", bold: false, fg: `--ft-terminal-${name}` }]);
		});
	});

	it("folds the bright range onto the same eight variables", () => {
		const bright = parseAnsi(`${ESC}[92mok`);
		const normal = parseAnsi(`${ESC}[32mok`);
		expect(bright).toEqual(normal);
		expect(bright[0]?.fg).toBe("--ft-terminal-green");
	});

	it("carries bold on its own", () => {
		expect(parseAnsi(`${ESC}[1mheads up`)).toEqual([{ text: "heads up", bold: true, fg: null }]);
	});

	it("applies every parameter of a compound sequence", () => {
		expect(parseAnsi(`${ESC}[1;32mpassed`)).toEqual([
			{ text: "passed", bold: true, fg: "--ft-terminal-green" },
		]);
	});

	it("resets both attributes on ESC[0m and on the empty ESC[m", () => {
		expect(parseAnsi(`${ESC}[1;31mbad${ESC}[0m fine`)).toEqual([
			{ text: "bad", bold: true, fg: "--ft-terminal-red" },
			{ text: " fine", bold: false, fg: null },
		]);
		expect(parseAnsi(`${ESC}[33mwarn${ESC}[m done`)).toEqual([
			{ text: "warn", bold: false, fg: "--ft-terminal-yellow" },
			{ text: " done", bold: false, fg: null },
		]);
	});

	it("keeps attributes across a switch of colour without resetting", () => {
		expect(parseAnsi(`${ESC}[1;31mred${ESC}[32mgreen`)).toEqual([
			{ text: "red", bold: true, fg: "--ft-terminal-red" },
			{ text: "green", bold: true, fg: "--ft-terminal-green" },
		]);
	});

	it("ignores SGR parameters outside the supported subset", () => {
		// Underline, background colour, and 256-colour foreground all pass through
		// as nothing: the text survives, the styling does not.
		const segments = parseAnsi(`${ESC}[4munderlined${ESC}[41;38;5;208mtinted`);
		expect(plain(segments)).toBe("underlinedtinted");
		expect(segments.every((s) => s.fg === null && !s.bold)).toBe(true);
	});

	it("strips cursor moves and erase sequences, merging the runs they split", () => {
		expect(parseAnsi(`${ESC}[2K${ESC}[1Aone${ESC}[Ktwo`)).toEqual([
			{ text: "onetwo", bold: false, fg: null },
		]);
	});

	it("strips OSC strings terminated by BEL or by ST", () => {
		expect(plain(parseAnsi(`${ESC}]0;build${BEL}running`))).toBe("running");
		expect(plain(parseAnsi(`${ESC}]0;build${ESC}\\running`))).toBe("running");
	});

	it("strips two-byte escapes and charset selections", () => {
		expect(plain(parseAnsi(`${ESC}(Bplain${ESC}=text`))).toBe("plaintext");
	});

	it("strips a sequence truncated by the end of the stream", () => {
		expect(parseAnsi(`ok${ESC}[3`)).toEqual([{ text: "ok", bold: false, fg: null }]);
		expect(parseAnsi(`ok${ESC}[`)).toEqual([{ text: "ok", bold: false, fg: null }]);
		expect(parseAnsi(`ok${ESC}`)).toEqual([{ text: "ok", bold: false, fg: null }]);
		expect(parseAnsi(`ok${ESC}]0;never closed`)).toEqual([{ text: "ok", bold: false, fg: null }]);
	});

	it("keeps newlines and whitespace intact", () => {
		expect(plain(parseAnsi(`${ESC}[32ma\n  b\tc\n`))).toBe("a\n  b\tc\n");
	});

	it("never throws, and never leaks an escape into the text", () => {
		const alphabet = [ESC, BEL, "[", "]", ";", "?", "0", "1", "3", "9", "m", "K", "\\", "a", "\n"];
		// Deterministic pseudo-random walk: same corpus on every run.
		let seed = 1337;
		const next = () => {
			seed = (seed * 1103515245 + 12345) % 2147483648;
			return seed / 2147483648;
		};
		for (let n = 0; n < 500; n++) {
			let garbage = "";
			const length = Math.floor(next() * 40);
			for (let k = 0; k < length; k++) {
				garbage += alphabet[Math.floor(next() * alphabet.length)];
			}
			const segments = parseAnsi(garbage);
			expect(plain(segments)).not.toContain(ESC);
		}
	});

	it("is total for input that is not a string", () => {
		expect(parseAnsi(undefined as unknown as string)).toEqual([]);
		expect(parseAnsi(null as unknown as string)).toEqual([]);
		expect(parseAnsi(42 as unknown as string)).toEqual([]);
	});

	describe("extended colour sequences", () => {
		it("reads a palette index as data, not as a code of its own", () => {
			// The 31 is the palette entry of `38;5;31`, not the code for red.
			expect(parseAnsi(`${ESC}[38;5;31mx`)).toEqual([{ text: "x", bold: false, fg: null }]);
		});

		it("reads a colour channel as data, not as bold", () => {
			expect(parseAnsi(`${ESC}[38;2;1;2;3mx`)).toEqual([{ text: "x", bold: false, fg: null }]);
		});

		it("still applies a real code that follows the sequence", () => {
			expect(parseAnsi(`${ESC}[38;5;208;1mx`)).toEqual([{ text: "x", bold: true, fg: null }]);
		});

		it("consumes only what is there when the sequence is truncated", () => {
			expect(parseAnsi(`${ESC}[38;5mx`)).toEqual([{ text: "x", bold: false, fg: null }]);
			expect(parseAnsi(`${ESC}[38;2;1;2mx`)).toEqual([{ text: "x", bold: false, fg: null }]);
		});

		it("treats a background sequence the same way", () => {
			expect(parseAnsi(`${ESC}[48;5;1mx`)).toEqual([{ text: "x", bold: false, fg: null }]);
		});
	});
});
