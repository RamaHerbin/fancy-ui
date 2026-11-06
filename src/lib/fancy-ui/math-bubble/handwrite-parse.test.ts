import { describe, expect, it } from "vitest";
import { parseFormula, type MathNode } from "./handwrite-parse.js";

function items(src: string): MathNode[] {
	const root = parseFormula(src);
	if (root.type !== "group") throw new Error("root is not a group");
	return root.items;
}

describe("parseFormula", () => {
	it("reads plain letters as chars and spaces as text spaces", () => {
		expect(items("a b")).toEqual([
			{ type: "char", ch: "a" },
			{ type: "space", width: 0.3, text: true },
			{ type: "char", ch: "b" },
		]);
	});

	it("reads braced and bare superscripts and subscripts", () => {
		const [x] = items("x^{2}_i");
		expect(x).toMatchObject({ type: "scripts", base: { ch: "x" }, sub: { ch: "i" } });
		expect((x as Extract<MathNode, { type: "scripts" }>).sup).toEqual({ type: "group", items: [{ type: "char", ch: "2" }] });
		expect(items("e^x")[0]).toMatchObject({ type: "scripts", sup: { type: "char", ch: "x" } });
	});

	it("turns a prime into a superscript", () => {
		expect(items("f'")[0]).toMatchObject({ type: "scripts", sup: { ch: "′" } });
	});

	it("reads fractions and square roots, nested", () => {
		const [f] = items("\\frac{1}{\\sqrt{x^2}}");
		expect(f.type).toBe("frac");
		const den = (f as Extract<MathNode, { type: "frac" }>).den;
		expect(den).toMatchObject({ type: "group", items: [{ type: "sqrt", body: { items: [{ type: "scripts" }] } }] });
		expect(items("\\sqrt[3]{y}")[0]).toMatchObject({ type: "sqrt", index: { items: [{ ch: "3" }] } });
	});

	it("reads big operators with their limits", () => {
		expect(items("\\sum_{n=0}^\\infty")[0]).toMatchObject({
			type: "scripts",
			base: { type: "bigop", ch: "∑", limits: true },
			sup: { ch: "∞" },
		});
		expect(items("\\int_0^1")[0]).toMatchObject({ base: { type: "bigop", ch: "∫", limits: false } });
		expect(items("\\iint \\oint \\prod").filter((n) => n.type === "bigop").map((n) => (n as { ch: string }).ch)).toEqual(["∬", "∮", "∏"]);
	});

	it("reads operator names as upright words, lim-like ones with limits", () => {
		expect(items("\\sin x")[0]).toEqual({ type: "word", text: "sin", limits: false });
		expect(items("\\lim_{x\\to 0}")[0]).toMatchObject({ type: "scripts", base: { type: "word", text: "lim", limits: true } });
	});

	it("maps Greek letters and symbols", () => {
		const chars = items("\\alpha\\Omega\\pi\\infty\\to\\leq\\nabla\\partial\\cdot\\in").map((n) => (n as { ch: string }).ch);
		expect(chars).toEqual(["α", "Ω", "π", "∞", "→", "≤", "∇", "∂", "·", "∈"]);
	});

	it("reads spacing commands", () => {
		expect(items("a\\,b\\;c\\quad d").filter((n) => n.type === "space").map((n) => (n as { width: number }).width)).toEqual([0.17, 0.28, 1, 0.3]);
	});

	it("fences \\left( \\right) and matched plain parentheses", () => {
		expect(items("\\left( x \\right)")[0]).toMatchObject({ type: "fenced", open: "(", close: ")" });
		expect(items("(a+b)")[0]).toMatchObject({ type: "fenced", open: "(", close: ")", body: { items: [{}, {}, {}] } });
		expect(items("(a")[0]).toEqual({ type: "char", ch: "(" });
	});

	it("writes unknown commands out as letters", () => {
		expect(items("\\foo")[0]).toEqual({ type: "word", text: "foo", limits: false });
	});

	it("never throws on broken input", () => {
		for (const src of ["", "\\", "^", "_{", "\\frac", "\\frac{", "}}}", "\\sqrt[", "\\left(", "\\right)", "x^^_", "{{{a", "\\left. x \\right|"]) {
			expect(() => parseFormula(src)).not.toThrow();
		}
	});
});
