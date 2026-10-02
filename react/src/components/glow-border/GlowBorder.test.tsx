import { render, cleanup } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, it, expect, vi } from "vitest";
import {
	GlowBorder,
	GLOW_BORDER_PRESETS,
	customPalette,
	glintArc,
	metalBackground,
	metalField,
} from "./GlowBorder.js";

describe("GlowBorder", () => {
	afterEach(cleanup);

	it("renders a div element", () => {
		const { container } = render(<GlowBorder />);
		const div = container.querySelector(".animate-glow");
		expect(div).toBeInTheDocument();
	});

	it("has pointer-events-none class", () => {
		const { container } = render(<GlowBorder />);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("pointer-events-none");
	});

	it("has absolute and inset-0 classes", () => {
		const { container } = render(<GlowBorder />);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("absolute");
		expect(div?.className).toContain("inset-0");
	});

	it("includes border-radius in inline style", () => {
		const { container } = render(<GlowBorder borderRadius={20} />);
		const div = container.firstElementChild as HTMLElement;
		const style = div.getAttribute("style") ?? "";
		expect(style).toContain("border-radius");
	});

	it("includes duration CSS var in style", () => {
		const { container } = render(<GlowBorder duration={5} />);
		const div = container.firstElementChild as HTMLElement;
		const style = div.getAttribute("style") ?? "";
		expect(style).toContain("--glow-duration: 5s");
	});

	it("includes border-width CSS var in style", () => {
		const { container } = render(<GlowBorder borderWidth={4} />);
		const div = container.firstElementChild as HTMLElement;
		const style = div.getAttribute("style") ?? "";
		expect(style).toContain("--glow-border-width: 4px");
	});

	it("includes border-radius CSS var in style", () => {
		const { container } = render(<GlowBorder borderRadius={16} />);
		const div = container.firstElementChild as HTMLElement;
		const style = div.getAttribute("style") ?? "";
		expect(style).toContain("--glow-border-radius: 16px");
	});

	// Regression: the declarations used to be written from a layout effect, so
	// the server rendered a bare <div> with no custom properties and the ring
	// only appeared once the client had hydrated. The style is a pure function
	// of the props, so it belongs in the render pass.
	it("ships the whole style in the server markup, not only after hydration", () => {
		const html = renderToStaticMarkup(
			<GlowBorder borderRadius={16} borderWidth={4} duration={5} color="#0ff" />
		);

		expect(html).toContain("--glow-border-radius:16px");
		expect(html).toContain("--glow-border-width:4px");
		expect(html).toContain("--glow-duration:5s");
		expect(html).toContain("#0ff");
		expect(html).toContain("--gb-metal-dark:conic-gradient");
		expect(html).toContain("glow-border__glint");
	});

	it("does not reach for a layout effect on the server", () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		try {
			renderToStaticMarkup(<GlowBorder />);
			const warned = error.mock.calls.some((call) => String(call[0]).includes("useLayoutEffect"));
			expect(warned).toBe(false);
		} finally {
			error.mockRestore();
		}
	});

	it("applies custom class names", () => {
		const { container } = render(<GlowBorder className="my-glow" />);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("my-glow");
	});

	it("preserves base classes when custom class is added", () => {
		const { container } = render(<GlowBorder className="extra" />);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("pointer-events-none");
		expect(div?.className).toContain("absolute");
	});
	it("is decorative: aria-hidden, with the metal, glint and halo layers", () => {
		const { container } = render(<GlowBorder />);
		const root = container.firstElementChild as HTMLElement;
		expect(root.getAttribute("aria-hidden")).toBe("true");
		for (const cls of ["metal", "glint", "halo"]) {
			expect(root.querySelector(`.glow-border__${cls}`)).toBeInTheDocument();
		}
	});

	it("passes both theme versions of the metal and the glint as CSS vars", () => {
		const { container } = render(<GlowBorder preset="gold" />);
		const style = (container.firstElementChild as HTMLElement).getAttribute("style") ?? "";
		expect(style).toContain("--gb-metal-dark: conic-gradient(from var(--gb-a1)");
		expect(style).toContain("--gb-metal-light: conic-gradient(from var(--gb-a1)");
		expect(style).toContain("--gb-glint-dark: conic-gradient(from var(--gb-a3)");
		// gold's dark body tone ends up in the dark metal
		expect(style).toContain(GLOW_BORDER_PRESETS.gold.dark.body);
	});

	it("clamps strength to 0–1", () => {
		const high = render(<GlowBorder strength={4} />);
		expect(high.container.firstElementChild?.getAttribute("style")).toContain("--glow-strength: 1");
		cleanup();
		const low = render(<GlowBorder strength={-1} />);
		expect(low.container.firstElementChild?.getAttribute("style")).toContain("--glow-strength: 0");
	});

	it("lets a custom color override the preset, woven with neutral metal tones", () => {
		const { container } = render(<GlowBorder color={["#ff0000", "#00ff00"]} />);
		const style = (container.firstElementChild as HTMLElement).getAttribute("style") ?? "";
		expect(style).toContain("#ff0000");
		expect(style).toContain("#00ff00");
		expect(style).not.toContain(GLOW_BORDER_PRESETS.chromatic.dark.tints[1]!);
		expect(customPalette("#abcdef", "dark").tints).toEqual(["#ffffff", "#abcdef"]);
		expect(customPalette([], "light").tints).toEqual(["#ffffff"]);
	});

	it("builds metal fields with one reflection per tint, starting and ending in shadow", () => {
		const p = { tints: ["#111111", "#222222"], body: "#888888", shadow: "#000000" };
		const field = metalField(p, "--x", "30% 40%");
		expect(field.startsWith("conic-gradient(from var(--x) at 30% 40%, #000000 0.0%")).toBe(true);
		expect(field).toContain("#111111 25.0%");
		expect(field).toContain("#222222 75.0%");
		expect(field.endsWith("#000000 100%)")).toBe(true);
		// the second field of the pair is offset, so reflections don't line up
		expect(metalBackground(p)).toContain("--gb-a2");
		expect(glintArc(p)).toContain("#ffffff 90%");
	});
});
