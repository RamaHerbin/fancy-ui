import { render } from "@testing-library/vue";
import { brutalSkin } from "./skins/brutal/index.js";
import { terminalSkin } from "./skins/terminal/index.js";
import { retroOsSkin } from "./skins/retro-os/index.js";
import { glassSkin } from "./skins/glass/index.js";

/**
 * The ornaments are rendered here on their own rather than through a primitive:
 * what a skin ships is the glyph, and the primitive that mounts it into the
 * `buttonTrailing` slot is covered by its own suite.
 */
describe("skin ornaments", () => {
	it("brutal renders the trailing arrow svg", () => {
		const trailing = brutalSkin.ornaments?.buttonTrailing;
		expect(trailing).toBeDefined();

		const { container } = render(trailing!);
		const svg = container.querySelector("svg");
		expect(svg).toHaveAttribute("aria-hidden", "true");
		expect(svg?.querySelector("path")).toHaveAttribute("d", "M3 11 L11 3 M4.5 3 L11 3 L11 9.5");
		expect(svg?.querySelector("path")).toHaveAttribute("stroke", "currentColor");
	});

	it("terminal renders the blinking caret span", () => {
		const trailing = terminalSkin.ornaments?.buttonTrailing;
		expect(trailing).toBeDefined();

		const { container } = render(trailing!);
		const caret = container.querySelector(".cam-caret");
		expect(caret).toBeInTheDocument();
		expect(caret?.textContent).toBe("▊");
	});

	it("retro-os renders the 2x2 pixel grid glyph", () => {
		const trailing = retroOsSkin.ornaments?.buttonTrailing;
		expect(trailing).toBeDefined();

		const { container } = render(trailing!);
		const glyph = container.querySelector('span[aria-hidden="true"]');
		expect(glyph).toBeInTheDocument();
		expect(glyph?.querySelectorAll("span")).toHaveLength(4);
	});

	it("glass defines no buttonTrailing", () => {
		expect(glassSkin.ornaments?.buttonTrailing).toBeUndefined();
	});

	// The recipe args are declared props, so binding them never leaks a
	// `variant` / `size` / `state` attribute onto the rendered glyph.
	it("takes the recipe args as props rather than as fallthrough attributes", () => {
		const trailing = brutalSkin.ornaments?.buttonTrailing;
		const { container } = render(trailing!, {
			props: { variant: "primary", size: "md", state: "default" },
		});
		const svg = container.querySelector("svg");
		expect(svg).not.toHaveAttribute("variant");
		expect(svg).not.toHaveAttribute("size");
		expect(svg).not.toHaveAttribute("state");
	});
});
