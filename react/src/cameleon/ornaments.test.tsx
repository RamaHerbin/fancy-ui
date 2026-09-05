import { render, screen } from "@testing-library/react";
import { FancyProvider } from "./FancyProvider.js";
import { Button } from "./primitives/index.js";
import { brutalSkin } from "./skins/brutal/index.js";
import { terminalSkin } from "./skins/terminal/index.js";
import { retroOsSkin } from "./skins/retro-os/index.js";
import { glassSkin } from "./skins/glass/index.js";

describe("skin ornaments (createRawSnippet → JSX)", () => {
	it("brutal Button renders the trailing arrow svg", () => {
		render(
			<FancyProvider skin={brutalSkin}>
				<Button>Go</Button>
			</FancyProvider>
		);
		const button = screen.getByRole("button", { name: "Go" });
		const path = button.querySelector("svg path");
		expect(path).toHaveAttribute("d", "M3 11 L11 3 M4.5 3 L11 3 L11 9.5");
	});

	it("terminal Button renders the blinking caret span", () => {
		render(
			<FancyProvider skin={terminalSkin}>
				<Button>Run</Button>
			</FancyProvider>
		);
		const button = screen.getByRole("button", { name: "Run" });
		const caret = button.querySelector(".cam-caret");
		expect(caret).toBeInTheDocument();
		expect(caret?.textContent).toBe("▊");
	});

	it("retro-os Button renders the 2x2 pixel grid glyph", () => {
		render(
			<FancyProvider skin={retroOsSkin}>
				<Button>Start</Button>
			</FancyProvider>
		);
		const button = screen.getByRole("button", { name: "Start" });
		const glyph = button.querySelector('span[aria-hidden="true"]');
		expect(glyph).toBeInTheDocument();
		expect(glyph?.querySelectorAll("span")).toHaveLength(4);
	});

	it("glass Button has no ornament (glass defines no buttonTrailing)", () => {
		render(
			<FancyProvider skin={glassSkin}>
				<Button>Send</Button>
			</FancyProvider>
		);
		const button = screen.getByRole("button", { name: "Send" });
		expect(button.querySelector("svg")).not.toBeInTheDocument();
	});
});
