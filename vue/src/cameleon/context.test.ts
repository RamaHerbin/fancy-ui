import { render, screen } from "@testing-library/vue";
import { defineComponent, h } from "vue";
import { provideSkin, useSkin } from "./context.js";
import FancyProvider from "./FancyProvider.vue";
import { defaultSkin } from "./skins/default.js";
import { brutalSkin } from "./skins/brutal/index.js";

/** The smallest possible context consumer: it renders the active skin's name. */
const SkinNameProbe = defineComponent({
	name: "SkinNameProbe",
	setup() {
		const ctx = useSkin();
		return () => h("span", { "data-testid": "probe" }, ctx.skin.name);
	},
});

describe("useSkin", () => {
	it("falls back to the default skin without a provider", () => {
		render(SkinNameProbe);
		expect(screen.getByTestId("probe")).toHaveTextContent(defaultSkin.name);
	});

	it("returns the provided skin inside a FancyProvider", () => {
		render(FancyProvider, {
			props: { skin: brutalSkin },
			slots: { default: () => h(SkinNameProbe) },
		});
		expect(screen.getByTestId("probe")).toHaveTextContent("brutal");
	});
});

// The Vue counterpart of the Svelte barrel's `setSkinContext`: skinning a
// subtree without <FancyProvider>'s wrapper element. What that costs the
// caller is asserted too — no `.cameleon-root`, so no scoped token variables.
describe("provideSkin", () => {
	it("skins a subtree from a bare provider, adding no element of its own", () => {
		const BareProvider = defineComponent({
			name: "BareProvider",
			setup() {
				provideSkin({
					get skin() {
						return brutalSkin;
					},
				});
				return () => [h(SkinNameProbe), h("span", "content")];
			},
		});

		const { container } = render(BareProvider);
		expect(screen.getByTestId("probe")).toHaveTextContent("brutal");
		expect(container.querySelector(".cameleon-root")).toBeNull();
		expect(container.querySelector("[data-skin]")).toBeNull();
	});
});
