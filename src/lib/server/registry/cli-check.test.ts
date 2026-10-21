import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
// The CLI check is a plain script; importing it must not run it (main guard).
// Loaded by URL, not a static import, so svelte-check does not type-check the script.
const script = pathToFileURL(resolve(process.cwd(), "scripts/check-registry-cli.mjs")).href;
const { importedSpecifiers } = (await import(/* @vite-ignore */ script)) as {
	importedSpecifiers: (text: string) => string[];
};

describe("check-registry-cli importedSpecifiers", () => {
	it("finds a multi-line static import", () => {
		const src = `import {\n\ta,\n\tb\n} from "reka-ui";\n`;
		expect(importedSpecifiers(src)).toEqual(["reka-ui"]);
	});

	it("ignores a commented-out import", () => {
		const src = `// import x from "ghost-a";\n/* import y from "ghost-b"; */\nimport z from "real";\n`;
		expect(importedSpecifiers(src)).toEqual(["real"]);
	});

	it("finds a dynamic import()", () => {
		expect(importedSpecifiers(`const m = await import("lazy-pkg");`)).toEqual(["lazy-pkg"]);
	});

	it("finds side-effect imports, re-exports and type imports", () => {
		const src = `import "side";\nexport * from "re";\nexport { a } from "named";\nimport type { T } from "types-only";\n`;
		expect(importedSpecifiers(src).sort()).toEqual(["named", "re", "side", "types-only"]);
	});
});
