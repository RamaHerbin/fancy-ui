import { render } from "@testing-library/react";
import { useSkin } from "./context.js";
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
