import { render, screen } from "@testing-library/react";
import { FancyProvider } from "./FancyProvider.js";
import { defaultSkin } from "./skins/default.js";
import { glassSkin } from "./skins/glass/index.js";

describe("FancyProvider", () => {
	it("renders the data-skin attribute", () => {
		render(
			<FancyProvider skin={defaultSkin}>
				<span>content</span>
			</FancyProvider>
		);
		const root = screen.getByText("content").closest("[data-skin]");
		expect(root).toHaveAttribute("data-skin", "default");
	});

	it("applies the skin's tokens as inline CSS custom properties", () => {
		render(
			<FancyProvider skin={defaultSkin}>
				<span>content</span>
			</FancyProvider>
		);
		const root = screen.getByText("content").closest("[data-skin]") as HTMLElement;
		expect(root.style.getPropertyValue("--skin-page-bg")).toBe("#ffffff");
		expect(root.style.getPropertyValue("--skin-page-fg")).toBe("#0a0a0a");
	});

	it("adds the dark class only when manageColorScheme is set on a dark-scheme skin", () => {
		const { rerender } = render(
			<FancyProvider skin={glassSkin}>
				<span>content</span>
			</FancyProvider>
		);
		let root = screen.getByText("content").closest("[data-skin]") as HTMLElement;
		expect(root.className).not.toContain("dark");

		rerender(
			<FancyProvider skin={glassSkin} manageColorScheme>
				<span>content</span>
			</FancyProvider>
		);
		root = screen.getByText("content").closest("[data-skin]") as HTMLElement;
		expect(root.className).toContain("dark");
	});

	it("never adds the dark class for a light-scheme skin, even with manageColorScheme", () => {
		render(
			<FancyProvider skin={defaultSkin} manageColorScheme>
				<span>content</span>
			</FancyProvider>
		);
		const root = screen.getByText("content").closest("[data-skin]") as HTMLElement;
		expect(root.className).not.toContain("dark");
	});

	it("renders children", () => {
		render(
			<FancyProvider skin={defaultSkin}>
				<button>click me</button>
			</FancyProvider>
		);
		expect(screen.getByRole("button", { name: "click me" })).toBeInTheDocument();
	});
});
