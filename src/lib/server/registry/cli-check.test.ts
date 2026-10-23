import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
// The CLI check is a plain script; importing it must not run it (main guard).
// Loaded by URL, not a static import, so svelte-check does not type-check the script.
const script = pathToFileURL(resolve(process.cwd(), "scripts/check-registry-cli.mjs")).href;
const { importedSpecifiers, selfImports, markerFor, CLI_VERSIONS } = (await import(
	/* @vite-ignore */ script
)) as {
	importedSpecifiers: (text: string) => string[];
	selfImports: (files: string[], readText: (f: string) => string) => string[];
	markerFor: (file: string) => string;
	CLI_VERSIONS: Readonly<Record<string, string>>;
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

describe("check-registry-cli scenario helpers", () => {
	it("pins every CLI and scaffolder to an exact version", () => {
		for (const [name, version] of Object.entries(CLI_VERSIONS)) {
			expect(version, name).toMatch(/^\d+\.\d+\.\d+$/);
		}
		expect(Object.keys(CLI_VERSIONS).sort()).toEqual(
			["shadcn", "shadcn-svelte", "shadcn-vue", "sv"].sort()
		);
	});

	it("flags an installed file that imports one of the fancy-ui npm packages", () => {
		const files: Record<string, string> = {
			"a/Button.tsx": 'import { cn } from "../utils";\nimport x from "fancy-ui-reactor";\n',
			"a/Dialog.svelte": '<script>\n\timport { Portal } from "fancy-ui-svelte";\n</script>\n',
			"a/Skin.vue":
				'<script setup>\nconst m = await import("fancy-ui-cameleon/skins");\n</script>\n',
			"a/notes.md": 'import x from "fancy-ui-vue";\n',
		};
		const hits = selfImports(Object.keys(files), (f) => files[f]);
		expect(hits).toEqual([
			"a/Dialog.svelte → fancy-ui-svelte",
			"a/Skin.vue → fancy-ui-cameleon/skins",
		]);
	});

	it("writes the edit marker in the file's own comment syntax", () => {
		expect(markerFor("x/Dialog.svelte")).toContain("<!--");
		expect(markerFor("x/Dialog.vue")).toContain("<!--");
		expect(markerFor("x/index.ts")).toContain("/*");
		expect(markerFor("x/button.css")).toContain("/*");
	});
});
