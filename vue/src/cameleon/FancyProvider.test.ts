import { render, screen } from "@testing-library/vue";
import { computed, defineComponent, h } from "vue";
import FancyProvider from "./FancyProvider.vue";
import { useSkin } from "./context.js";
import { defaultSkin } from "./skins/default.js";
import { brutalSkin } from "./skins/brutal/index.js";
import { glassSkin } from "./skins/glass/index.js";

/**
 * A consumer that exposes both surfaces a live skin swap has to move: the
 * context read and a recipe-derived class string. (The primitives' own suite
 * covers the third, the rendered element.)
 */
const SkinProbe = defineComponent({
	name: "SkinProbe",
	setup() {
		const ctx = useSkin();
		const buttonRoot = computed(() => ctx.skin.recipes.button({}).root ?? "");
		return () =>
			h("span", { "data-testid": "probe", "data-button-root": buttonRoot.value }, ctx.skin.name);
	},
});

const content = () => h("span", "content");

function rootOf(): HTMLElement {
	return screen.getByText("content").closest("[data-skin]") as HTMLElement;
}

describe("FancyProvider", () => {
	it("renders the data-skin attribute", () => {
		render(FancyProvider, { props: { skin: defaultSkin }, slots: { default: content } });
		expect(rootOf()).toHaveAttribute("data-skin", "default");
	});

	it("applies the skin's tokens as inline CSS custom properties", () => {
		render(FancyProvider, { props: { skin: defaultSkin }, slots: { default: content } });
		const root = rootOf();
		expect(root.style.getPropertyValue("--skin-page-bg")).toBe("#ffffff");
		expect(root.style.getPropertyValue("--skin-page-fg")).toBe("#0a0a0a");
	});

	it("adds the dark class only when manageColorScheme is set on a dark-scheme skin", async () => {
		const { rerender } = render(FancyProvider, {
			props: { skin: glassSkin },
			slots: { default: content },
		});
		expect(rootOf().className).not.toContain("dark");

		await rerender({ skin: glassSkin, manageColorScheme: true });
		expect(rootOf().className).toContain("dark");
	});

	it("never adds the dark class for a light-scheme skin, even with manageColorScheme", () => {
		render(FancyProvider, {
			props: { skin: defaultSkin, manageColorScheme: true },
			slots: { default: content },
		});
		expect(rootOf().className).not.toContain("dark");
	});

	it("merges the class prop onto the root, after cameleon-root", () => {
		render(FancyProvider, {
			props: { skin: defaultSkin, class: "my-shell" },
			slots: { default: content },
		});
		const root = rootOf();
		expect(root.className).toContain("cameleon-root");
		expect(root.className).toContain("my-shell");
	});

	it("renders children", () => {
		render(FancyProvider, {
			props: { skin: defaultSkin },
			slots: { default: () => h("button", "click me") },
		});
		expect(screen.getByRole("button", { name: "click me" })).toBeInTheDocument();
	});

	// The context value is a getter object read live, and that is what re-renders
	// consumers — a plain `{ skin }` captured in `setup` would strand the whole
	// subtree on the first skin. Asserted through all three surfaces the swap has
	// to move: the context read, a recipe-derived class, and the scoped tokens.
	it("re-renders consumers when the skin prop changes", async () => {
		const { rerender } = render(FancyProvider, {
			props: { skin: defaultSkin },
			slots: { default: () => [h(SkinProbe), content()] },
		});

		let probe = screen.getByTestId("probe");
		expect(probe).toHaveTextContent("default");
		expect(probe.getAttribute("data-button-root")).toContain("bg-neutral-900");
		expect(rootOf()).toHaveAttribute("data-skin", "default");
		expect(rootOf().style.getPropertyValue("--skin-page-bg")).toBe("#ffffff");

		await rerender({ skin: brutalSkin });

		probe = screen.getByTestId("probe");
		expect(probe).toHaveTextContent("brutal");
		expect(probe.getAttribute("data-button-root")).toContain("bg-[#141414]");
		expect(probe.getAttribute("data-button-root")).not.toContain("bg-neutral-900");
		expect(rootOf()).toHaveAttribute("data-skin", "brutal");
		expect(rootOf().style.getPropertyValue("--skin-page-bg")).toBe("#F4EEE0");
	});
});

// The provider's only side effect on anything it does not own. The dedupe is a
// `getElementById` guard with no cleanup, so it has to survive a genuine
// remount later in the session: the second mount re-runs the injection against
// a <head> that already holds the link.
describe("FancyProvider — webfont injection", () => {
	const clearFontLink = () => document.getElementById("cam-font-brutal")?.remove();

	beforeEach(clearFontLink);
	afterEach(clearFontLink);

	it("injects each skin font link exactly once across a remount", () => {
		const { unmount } = render(FancyProvider, {
			props: { skin: brutalSkin },
			slots: { default: content },
		});
		expect(document.head.querySelectorAll("#cam-font-brutal")).toHaveLength(1);
		const link = document.getElementById("cam-font-brutal") as HTMLLinkElement;
		const fonts = brutalSkin.fonts ?? [];
		expect(fonts).toHaveLength(1);
		expect(link.rel).toBe("stylesheet");
		expect(link.href).toBe(fonts[0]?.href);

		unmount();
		render(FancyProvider, { props: { skin: brutalSkin }, slots: { default: content } });
		expect(document.head.querySelectorAll("#cam-font-brutal")).toHaveLength(1);
	});

	it("injects nothing for a skin that declares no fonts", () => {
		render(FancyProvider, { props: { skin: defaultSkin }, slots: { default: content } });
		expect(document.head.querySelectorAll("#cam-font-brutal")).toHaveLength(0);
	});

	// The mount leg is `onMounted`; this is the watcher leg, which is the only
	// thing that injects a font for a skin swapped in after the first paint.
	it("injects the fonts of a skin swapped in after mount", async () => {
		const { rerender } = render(FancyProvider, {
			props: { skin: defaultSkin },
			slots: { default: content },
		});
		expect(document.head.querySelectorAll("#cam-font-brutal")).toHaveLength(0);

		await rerender({ skin: brutalSkin });
		expect(document.head.querySelectorAll("#cam-font-brutal")).toHaveLength(1);
	});
});
