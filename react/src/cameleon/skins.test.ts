import { defaultSkin } from "./skins/default.js";
import { brutalSkin } from "./skins/brutal/index.js";
import { glassSkin } from "./skins/glass/index.js";
import { terminalSkin } from "./skins/terminal/index.js";
import { retroOsSkin } from "./skins/retro-os/index.js";
import type { Skin } from "./types.js";

const skins: Skin[] = [defaultSkin, brutalSkin, glassSkin, terminalSkin, retroOsSkin];

const RECIPE_NAMES = [
	"button",
	"badge",
	"input",
	"textarea",
	"select",
	"checkbox",
	"radio",
	"switch",
	"slider",
	"tooltip",
] as const;

describe("cameleon skins", () => {
	for (const skin of skins) {
		describe(skin.name, () => {
			it("implements all 10 recipes, each returning a non-empty root class for default args", () => {
				for (const name of RECIPE_NAMES) {
					const fn = skin.recipes[name];
					expect(typeof fn).toBe("function");
					const { root } = fn({});
					expect(typeof root).toBe("string");
					expect(root).toBeTruthy();
				}
			});

			it("declares --skin-page-bg and --skin-page-fg tokens", () => {
				expect(skin.tokens["--skin-page-bg"]).toBeTruthy();
				expect(skin.tokens["--skin-page-fg"]).toBeTruthy();
			});
		});
	}
});
