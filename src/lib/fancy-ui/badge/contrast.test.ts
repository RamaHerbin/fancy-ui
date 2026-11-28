import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * WCAG contrast for the Wave G colour fixes. Colours are read from the shipped
 * sources (token files, class strings, stylesheet values), resolved to sRGB
 * and measured, so a regression in any of them fails here.
 */
type RGB = [number, number, number]; // 0..1 sRGB, gamma-encoded

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

const enc = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);
const lin = (x: number) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);

function oklch(L: number, C: number, h: number): RGB {
	const a = C * Math.cos((h * Math.PI) / 180);
	const b = C * Math.sin((h * Math.PI) / 180);
	const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
	const rgb = [
		4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
		-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
		-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
	];
	return rgb.map((x) => Math.min(1, Math.max(0, enc(x)))) as RGB;
}

function parseOklch(src: string): RGB {
	const m = /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/.exec(src);
	if (!m) throw new Error(`no oklch() in: ${src}`);
	return oklch(Number(m[1]), Number(m[2]), Number(m[3]));
}

function hex(s: string): RGB {
	return [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16) / 255) as RGB;
}

/** Straight alpha composite in gamma space, as browsers do for opacity/color-mix(srgb). */
const over = (fg: RGB, bg: RGB, a: number): RGB =>
	fg.map((v, i) => v * a + (bg[i] as number) * (1 - a)) as RGB;

const luminance = (c: RGB) => {
	const [r, g, b] = c.map((x) => lin(Math.round(x * 255) / 255)) as RGB;
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: RGB, b: RGB) => {
	const x = luminance(a);
	const y = luminance(b);
	return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

const WHITE: RGB = [1, 1, 1];

describe("light --muted-foreground", () => {
	const css = read("../tailwind.css");
	const line = /--muted-foreground:\s*light-dark\(([^,]+\)),/.exec(css);
	const lightMuted = parseOklch(line?.[1] ?? "");
	const fg = parseOklch("oklch(0.129 0.042 264.695)");
	const muted = parseOklch("oklch(0.968 0.007 247.896)");

	it("holds 4.5:1 on white and on 5/7 % foreground tints", () => {
		expect(ratio(lightMuted, WHITE)).toBeGreaterThanOrEqual(4.5);
		expect(ratio(lightMuted, over(fg, WHITE, 0.05))).toBeGreaterThanOrEqual(4.5);
		expect(ratio(lightMuted, over(fg, WHITE, 0.07))).toBeGreaterThanOrEqual(4.5);
	});
	it("holds 4.5:1 on the muted surface, plain and tinted 5 %", () => {
		expect(ratio(lightMuted, muted)).toBeGreaterThanOrEqual(4.5);
		expect(ratio(lightMuted, over(fg, muted, 0.05))).toBeGreaterThanOrEqual(4.5);
	});
	it("is the same value in all four token files", () => {
		for (const f of ["../../../../react/tailwind.css", "../../../../vue/tailwind.css"]) {
			expect(read(f)).toContain(line?.[1] ?? "x");
		}
		expect(read("../../../routes/layout.css")).toContain(line?.[1] ?? "x");
	});
});

describe("soft destructive pair (Badge, Button)", () => {
	const dest = oklch(0.577, 0.245, 27.325);
	const decl =
		/--destructive-foreground-soft:\s*light-dark\((oklch\([^)]+\)),\s*(oklch\([^)]+\))\)/.exec(
			read("../tailwind.css")
		);
	const lightText = parseOklch(decl?.[1] ?? "");
	const darkText = parseOklch(decl?.[2] ?? "");

	it.each([0.1, 0.2])("light text holds 4.5:1 on destructive/%s over white", (a) => {
		expect(ratio(lightText, over(dest, WHITE, a))).toBeGreaterThanOrEqual(4.5);
	});
	it.each([0.1, 0.2])("dark text holds 4.5:1 on destructive/%s over the dark background", (a) => {
		const d = oklch(0.704, 0.191, 22.216);
		expect(ratio(darkText, over(d, oklch(0.05, 0, 0), a))).toBeGreaterThanOrEqual(4.5);
	});
	it("is declared in all four token files", () => {
		for (const f of ["../../../../react/tailwind.css", "../../../../vue/tailwind.css"]) {
			expect(read(f)).toContain(decl?.[0] ?? "x");
		}
		expect(read("../../../routes/layout.css")).toContain("--destructive-foreground-soft");
	});
	it("Button and Badge use the same token class", () => {
		expect(read("../button/Button.svelte")).toContain("text-destructive-foreground-soft");
		expect(read("./Badge.svelte")).toContain("text-destructive-foreground-soft");
	});
});

describe("component-owned muted colours", () => {
	it("Timeline --_tl-muted holds 4.5:1 in both themes", () => {
		const src = read("../timeline/Timeline.svelte");
		const light = /--_tl-muted:\s*rgba\(0, 0, 0, ([\d.]+)\)/.exec(src);
		const dark = /--_tl-muted:\s*rgba\(255, 255, 255, ([\d.]+)\)/.exec(src);
		const lightBg = hex("#fafafa");
		const darkBg = hex("#0e0e10");
		expect(ratio(over([0, 0, 0], lightBg, Number(light?.[1])), lightBg)).toBeGreaterThanOrEqual(
			4.5
		);
		expect(ratio(over([1, 1, 1], darkBg, Number(dark?.[1])), darkBg)).toBeGreaterThanOrEqual(4.5);
	});

	it("ReviewCard --_muted holds 4.5:1 on the card shell and panel, per theme", () => {
		const src = read("../marquee/ReviewCard.svelte");
		const muted = [...src.matchAll(/--_muted: var\(--review-card-muted, (#[0-9a-f]{6})\)/g)].map(
			(m) => m[1] as string
		);
		expect(muted).toHaveLength(2);
		const [light, dark] = muted as [string, string];
		for (const bg of ["#f4f4f5", "#fafafa", "#ffffff"]) {
			expect(ratio(hex(light), hex(bg))).toBeGreaterThanOrEqual(4.5);
		}
		for (const bg of ["#0e0e10", "#141416", "#17171a"]) {
			expect(ratio(hex(dark), hex(bg))).toBeGreaterThanOrEqual(4.5);
		}
	});

	it("Step description, SidebarGroup label and the CodeDiff gutter no longer dim their text", () => {
		expect(read("../stepper/Step.svelte")).not.toContain("text-muted-foreground/80");
		expect(read("../sidebar/SidebarGroup.svelte")).not.toContain("text-muted-foreground/70");
		const diff = read("../code-diff/CodeDiff.svelte");
		expect(diff).toMatch(/\.ft-num \{[^}]*color: var\(--muted-foreground\);/);
		expect(diff).toMatch(/\.ft-glyph \{[^}]*opacity: 0\.7;/);
	});

	it("Slider bubble reads its own foreground variable, not the fill gradient end", () => {
		const src = read("../slider/Slider.svelte");
		expect(src).toContain('style:color="var(--ft-slider-bubble-fg)"');
		expect(src).toContain("--ft-slider-bubble-fg:");
	});
});
