import fs from "node:fs";
import path from "node:path";
import { officialAddons } from "sv";
import { createSetupTest } from "sv/testing";
import * as vitest from "vitest";
import addon from "../../src/index";

const { expect } = vitest;
const VERSION = __FANCY_VERSION__;

// sv's typings resolve another vitest copy of the workspace (4.0), so the module is cast to
// the shape sv declares; at run time it is this package's vitest, the one running the file.
type VitestContext = Parameters<typeof createSetupTest>[0];
const { test, testCases } = createSetupTest(vitest as unknown as VitestContext)(
	{ "fancy-ui": addon, tailwindcss: officialAddons.tailwindcss },
	{
		kinds: [
			{
				type: "default",
				options: { "fancy-ui": { demo: true }, tailwindcss: { plugins: [] } },
			},
		],
		// Browser checks live in scripts/consumers/sv-addon.sh (local tarball, Playwright).
		browser: false,
	}
);

test.concurrent.for(testCases)("fancy-ui $kind.type $variant", (testCase, ctx) => {
	const cwd = ctx.cwd(testCase);
	const kit = testCase.variant.startsWith("kit");
	const read = (f: string) => fs.readFileSync(path.resolve(cwd, f), "utf8");

	const pkg = JSON.parse(read("package.json"));
	expect(pkg.dependencies["fancy-ui-svelte"]).toBe(`^${VERSION}`);
	// pnpm install ran for the whole matrix: the published package resolved.
	expect(fs.existsSync(path.resolve(cwd, "node_modules/fancy-ui-svelte/package.json"))).toBe(true);

	const css = read(kit ? "src/routes/layout.css" : "src/app.css");
	expect(css).toContain(`@import 'tailwindcss';\n@import 'fancy-ui-svelte/tailwind.css';`);
	if (kit) expect(read("src/routes/demo/fancy-ui/+page.svelte")).toContain("RainbowButton");
	else expect(read("src/lib/fancy-ui-demo/FancyDemo.svelte")).toContain("RainbowButton");
});
