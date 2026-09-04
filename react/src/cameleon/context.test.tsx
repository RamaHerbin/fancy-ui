import { render } from "@testing-library/react";
import { SkinReactContext, useSkin } from "./context.js";
import { FancyProvider } from "./FancyProvider.js";
import { defaultSkin } from "./skins/default.js";
import { brutalSkin } from "./skins/brutal/index.js";

function SkinNameProbe({ onName }: { onName: (name: string) => void }) {
	const ctx = useSkin();
	onName(ctx.skin.name);
	return null;
}

describe("useSkin", () => {
	it("falls back to the default skin without a provider", () => {
		let seen = "";
		render(<SkinNameProbe onName={(name) => (seen = name)} />);
		expect(seen).toBe(defaultSkin.name);
	});

	it("returns the provided skin inside a FancyProvider", () => {
		let seen = "";
		render(
			<FancyProvider skin={brutalSkin}>
				<SkinNameProbe onName={(name) => (seen = name)} />
			</FancyProvider>
		);
		expect(seen).toBe("brutal");
	});
});

// The React stand-in for the Svelte barrel's `setSkinContext`: skinning a
// subtree without <FancyProvider>'s wrapper element. What that costs the
// caller is asserted too — no `.cameleon-root`, so no scoped token variables.
describe("SkinReactContext", () => {
	it("skins a subtree from a bare provider, adding no element of its own", () => {
		let seen = "";
		const { container } = render(
			<SkinReactContext.Provider value={{ skin: brutalSkin }}>
				<SkinNameProbe onName={(name) => (seen = name)} />
				<span>content</span>
			</SkinReactContext.Provider>
		);
		expect(seen).toBe("brutal");
		expect(container.querySelector(".cameleon-root")).toBeNull();
		expect(container.querySelector("[data-skin]")).toBeNull();
	});
});
