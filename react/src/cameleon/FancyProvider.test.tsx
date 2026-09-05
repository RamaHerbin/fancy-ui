import { StrictMode } from "react";
import { render, screen } from "@testing-library/react";
import { FancyProvider } from "./FancyProvider.js";
import { useSkin } from "./context.js";
import { Button } from "./primitives/Button.js";
import { defaultSkin } from "./skins/default.js";
import { brutalSkin } from "./skins/brutal/index.js";
import { glassSkin } from "./skins/glass/index.js";

function SkinNameProbe({ onName }: { onName: (name: string) => void }) {
	onName(useSkin().skin.name);
	return null;
}

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

	// The context value is rebuilt whenever `skin` changes, and the rebuild is
	// what re-renders consumers — a `useMemo(..., [])` here would strand the
	// whole subtree on the first skin. Asserted through all three surfaces the
	// swap has to move: the context read, a recipe-derived class, and the
	// scoped token variables.
	it("re-renders consumers when the skin prop changes", () => {
		let seen = "";
		const { rerender } = render(
			<FancyProvider skin={defaultSkin}>
				<SkinNameProbe onName={(name) => (seen = name)} />
				<Button>go</Button>
			</FancyProvider>
		);
		expect(seen).toBe("default");
		let button = screen.getByRole("button", { name: "go" });
		let root = button.closest("[data-skin]") as HTMLElement;
		expect(button.className).toContain("bg-neutral-900");
		expect(root).toHaveAttribute("data-skin", "default");
		expect(root.style.getPropertyValue("--skin-page-bg")).toBe("#ffffff");

		rerender(
			<FancyProvider skin={brutalSkin}>
				<SkinNameProbe onName={(name) => (seen = name)} />
				<Button>go</Button>
			</FancyProvider>
		);
		expect(seen).toBe("brutal");
		button = screen.getByRole("button", { name: "go" });
		root = button.closest("[data-skin]") as HTMLElement;
		expect(button.className).toContain("bg-[#141414]");
		expect(button.className).not.toContain("bg-neutral-900");
		expect(root).toHaveAttribute("data-skin", "brutal");
		expect(root.style.getPropertyValue("--skin-page-bg")).toBe("#F4EEE0");
	});
});

// The provider's only side effect on anything it does not own. The dedupe is a
// `getElementById` guard with no cleanup, so it has to survive the StrictMode
// mount → unmount → mount cycle AND a genuine remount later in the session:
// both re-run the effect against a <head> that already holds the link.
describe("FancyProvider — webfont injection", () => {
	const clearFontLink = () => document.getElementById("cam-font-brutal")?.remove();

	beforeEach(clearFontLink);
	afterEach(clearFontLink);

	it("injects each skin font link exactly once under StrictMode", () => {
		const { unmount } = render(
			<StrictMode>
				<FancyProvider skin={brutalSkin}>
					<span>content</span>
				</FancyProvider>
			</StrictMode>
		);
		expect(document.head.querySelectorAll("#cam-font-brutal")).toHaveLength(1);
		const link = document.getElementById("cam-font-brutal") as HTMLLinkElement;
		const fonts = brutalSkin.fonts ?? [];
		expect(fonts).toHaveLength(1);
		expect(link.rel).toBe("stylesheet");
		expect(link.href).toBe(fonts[0]?.href);

		unmount();
		render(
			<StrictMode>
				<FancyProvider skin={brutalSkin}>
					<span>content</span>
				</FancyProvider>
			</StrictMode>
		);
		expect(document.head.querySelectorAll("#cam-font-brutal")).toHaveLength(1);
	});

	it("injects nothing for a skin that declares no fonts", () => {
		render(
			<FancyProvider skin={defaultSkin}>
				<span>content</span>
			</FancyProvider>
		);
		expect(document.head.querySelectorAll("#cam-font-brutal")).toHaveLength(0);
	});
});
