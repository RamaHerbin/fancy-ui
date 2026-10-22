import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { add, create, defineAddon, defineAddonOptions, officialAddons } from "sv";
import { afterAll, describe, expect, it } from "vitest";
import addon from "../../src/index";

// The add-on driven by sv's own engine (`add`, the function the CLI and sv/testing call)
// on projects scaffolded from sv's bundled templates. Offline: nothing is installed.

const VERSION = __FANCY_VERSION__;
const root = fs.mkdtempSync(path.join(os.tmpdir(), "fancy-ui-sv-unit-"));
afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

const variants = {
	"kit-ts": { template: "minimal", types: "typescript" },
	"kit-js": { template: "minimal", types: "checkjs" },
	"vite-ts": { template: "svelte", types: "typescript" },
	"vite-js": { template: "svelte", types: "none" },
} as const;
type Variant = keyof typeof variants;

let n = 0;
function project(variant: Variant): string {
	const cwd = path.join(root, `${variant}-${n++}`);
	create({ cwd, name: path.basename(cwd), ...variants[variant] });
	return cwd;
}

const tailwind = officialAddons.tailwindcss;
const fancy = { "fancy-ui": addon };
const opts = (demo: boolean) => ({ "fancy-ui": { demo }, tailwindcss: { plugins: [] } });

const read = (cwd: string, f: string) => fs.readFileSync(path.join(cwd, f), "utf8");
const pkg = (cwd: string) => JSON.parse(read(cwd, "package.json"));
const stylesheet = (variant: Variant) =>
	variant.startsWith("kit") ? "src/routes/layout.css" : "src/app.css";

/** sha256 of every file of the project, keyed by relative path. */
function snapshot(cwd: string): Record<string, string> {
	const out: Record<string, string> = {};
	for (const f of fs.readdirSync(cwd, { recursive: true }) as string[]) {
		const p = path.join(cwd, f);
		if (fs.statSync(p).isFile())
			out[f] = createHash("sha256").update(fs.readFileSync(p)).digest("hex");
	}
	return out;
}

describe.each(Object.keys(variants) as Variant[])("%s", (variant) => {
	const kit = variant.startsWith("kit");
	const ts = variant.endsWith("ts");

	it("no Tailwind: runs after the tailwindcss add-on and wires both; re-run is a no-op", async () => {
		const cwd = project(variant);
		expect(pkg(cwd).devDependencies.tailwindcss).toBeUndefined();
		// fancy-ui listed FIRST: only its dependsOn("tailwindcss") puts tailwind before it.
		const first = await add({
			cwd,
			addons: { ...fancy, tailwindcss: tailwind },
			options: opts(true),
		});
		expect(first.status).toEqual({ tailwindcss: "success", "fancy-ui": "success" });

		const p = pkg(cwd);
		expect(p.dependencies["fancy-ui-svelte"]).toBe(`^${VERSION}`);
		expect(p.devDependencies.tailwindcss).toMatch(/^\^4\./);
		const css = read(cwd, stylesheet(variant));
		// Kit: the stylesheet is new. Vite: the template's app.css keeps its rules below.
		expect(
			css.startsWith(`@import 'tailwindcss';\n@import 'fancy-ui-svelte/tailwind.css';\n`)
		).toBe(true);
		if (kit) expect(css).toBe(`@import 'tailwindcss';\n@import 'fancy-ui-svelte/tailwind.css';\n`);

		if (kit) {
			const page = read(cwd, "src/routes/demo/fancy-ui/+page.svelte");
			expect(page).toContain(`from "fancy-ui-svelte"`);
			expect(page.includes('<script lang="ts">')).toBe(ts);
			expect(read(cwd, "src/routes/demo/DemoLinks.svelte")).toContain("/demo/fancy-ui");
			expect(read(cwd, "src/routes/+layout.svelte")).toContain("<DemoLinks />");
		} else {
			const demo = read(cwd, "src/lib/fancy-ui-demo/FancyDemo.svelte");
			expect(demo.includes('<script lang="ts">')).toBe(ts);
			expect(read(cwd, "src/App.svelte")).not.toContain("FancyDemo");
		}

		const before = snapshot(cwd);
		const again = await add({ cwd, addons: fancy, options: opts(true) });
		expect(again.status).toEqual({ "fancy-ui": "success" });
		expect(again.installNeeded).toBe(false);
		expect(snapshot(cwd)).toEqual(before);
	});

	it("Tailwind already set up with double quotes and a dark variant: one line added", async () => {
		const cwd = project(variant);
		await add({ cwd, addons: { tailwindcss: tailwind }, options: opts(false) });
		const file = stylesheet(variant);
		const mine = `/* mine */\n@import "tailwindcss";\n\n@custom-variant dark (&:where(.dark, .dark *));\n`;
		fs.writeFileSync(path.join(cwd, file), mine);

		await add({ cwd, addons: fancy, options: opts(false) });
		expect(read(cwd, file)).toBe(
			mine.replace(`"tailwindcss";`, `"tailwindcss";\n@import "fancy-ui-svelte/tailwind.css";`)
		);
		expect(fs.existsSync(path.join(cwd, "src/routes/demo"))).toBe(false);
		expect(fs.existsSync(path.join(cwd, "src/lib/fancy-ui-demo"))).toBe(false);

		const before = snapshot(cwd);
		await add({ cwd, addons: fancy, options: opts(false) });
		expect(snapshot(cwd)).toEqual(before);
	});
});

describe("existing installs are respected", () => {
	it.each(["^0.99.0", "file:../fancy-ui-svelte.tgz"])("keeps a declared %s", async (spec) => {
		const cwd = project("kit-ts");
		await add({ cwd, addons: { tailwindcss: tailwind }, options: opts(false) });
		const p = pkg(cwd);
		p.dependencies = { ...p.dependencies, "fancy-ui-svelte": spec };
		fs.writeFileSync(path.join(cwd, "package.json"), JSON.stringify(p, null, "\t") + "\n");
		const result = await add({ cwd, addons: fancy, options: opts(false) });
		expect(pkg(cwd).dependencies["fancy-ui-svelte"]).toBe(spec);
		expect(result.installNeeded).toBe(false);
	});

	it("an unparsable CSS file is skipped by sv add, the entry still wired", async () => {
		const cwd = project("kit-ts");
		await add({ cwd, addons: { tailwindcss: tailwind }, options: opts(false) });
		fs.mkdirSync(path.join(cwd, "src/styles"));
		fs.writeFileSync(path.join(cwd, "src/styles/broken.css"), `.a { color: red;`);
		const result = await add({ cwd, addons: fancy, options: opts(false) });
		expect(result.status).toEqual({ "fancy-ui": "success" });
		expect(read(cwd, "src/routes/layout.css")).toContain("fancy-ui-svelte/tailwind.css");
		expect(read(cwd, "src/styles/broken.css")).toBe(`.a { color: red;`);
	});

	it("CSS imported from another file than the default stylesheet: that file is edited, once", async () => {
		const cwd = project("vite-ts");
		await add({ cwd, addons: { tailwindcss: tailwind }, options: opts(false) });
		fs.rmSync(path.join(cwd, "src/app.css"));
		fs.mkdirSync(path.join(cwd, "src/styles"));
		fs.writeFileSync(path.join(cwd, "src/styles/a.css"), `body { margin: 0 }\n`);
		fs.writeFileSync(path.join(cwd, "src/styles/main.css"), `@import "tailwindcss";\n`);
		await add({ cwd, addons: fancy, options: opts(false) });
		expect(read(cwd, "src/styles/main.css")).toContain(`@import "fancy-ui-svelte/tailwind.css";`);
		expect(read(cwd, "src/styles/a.css")).toBe(`body { margin: 0 }\n`);
		// the default stylesheet is not created
		expect(fs.existsSync(path.join(cwd, "src/app.css"))).toBe(false);
	});
});

describe("setup", () => {
	type Calls = { unsupported: string[]; dependsOn: string[] };
	async function setup(cwd: string, deps: Record<string, string>): Promise<Calls> {
		const calls: Calls = { unsupported: [], dependsOn: [] };
		await addon.setup!({
			cwd,
			dependencyVersion: (p: string) => deps[p],
			file: { stylesheet: "src/app.css" },
			directory: { src: "src" },
			unsupported: (r: string) => calls.unsupported.push(r),
			dependsOn: (id: string) => calls.dependsOn.push(id),
		} as never);
		return calls;
	}

	it("refuses Svelte 4 and Tailwind v3", async () => {
		const cwd = fs.mkdtempSync(path.join(root, "setup-"));
		const v4 = await setup(cwd, { svelte: "4.2.0", tailwindcss: "4.1.0" });
		expect(v4.unsupported).toHaveLength(1);
		expect(v4.dependsOn).toEqual([]);
		const v3 = await setup(cwd, { svelte: "5.40.0", tailwindcss: "3.4.0" });
		expect(v3.unsupported[0]).toMatch(/Tailwind CSS v4/);
		expect(v3.dependsOn).toEqual([]);
	});

	it("an unreadable major (catalog:, workspace:*, latest) does not add a second Tailwind", async () => {
		const cwd = fs.mkdtempSync(path.join(root, "setup-"));
		fs.mkdirSync(path.join(cwd, "src"));
		fs.writeFileSync(path.join(cwd, "src/app.css"), `@import "tailwindcss";`);
		for (const range of ["catalog:", "workspace:*", "latest", undefined]) {
			const deps: Record<string, string> = { svelte: "5.40.0" };
			if (range) deps.tailwindcss = range;
			expect(await setup(cwd, deps)).toEqual({ unsupported: [], dependsOn: [] });
		}
	});

	it("refuses a prefixed Tailwind import", async () => {
		const cwd = fs.mkdtempSync(path.join(root, "setup-"));
		fs.mkdirSync(path.join(cwd, "src"));
		fs.writeFileSync(path.join(cwd, "src/app.css"), `@import "tailwindcss" prefix(tw);`);
		const calls = await setup(cwd, { svelte: "5.40.0", tailwindcss: "4.1.0" });
		expect(calls.unsupported[0]).toMatch(/prefix\(tw\) in src\/app\.css/);
		expect(calls.dependsOn).toEqual([]);
	});

	it("a CSS file that does not parse does not crash setup", async () => {
		const cwd = fs.mkdtempSync(path.join(root, "setup-"));
		fs.mkdirSync(path.join(cwd, "src/odd"), { recursive: true });
		fs.writeFileSync(path.join(cwd, "src/app.css"), `@import "tailwindcss";`);
		fs.writeFileSync(path.join(cwd, "src/odd/broken.css"), `.a { color: red;`);
		expect(await setup(cwd, { svelte: "5.40.0", tailwindcss: "4.1.0" })).toEqual({
			unsupported: [],
			dependsOn: [],
		});
		// the unparsable file may be the Tailwind entry: no second Tailwind either
		fs.rmSync(path.join(cwd, "src/app.css"));
		fs.writeFileSync(path.join(cwd, "src/odd/broken.css"), `@import "tailwindcss"`);
		expect((await setup(cwd, { svelte: "5.40.0", tailwindcss: "4.1.0" })).dependsOn).toEqual([]);
	});

	it("depends on tailwindcss when it is declared but imported by no CSS file", async () => {
		const cwd = fs.mkdtempSync(path.join(root, "setup-"));
		expect((await setup(cwd, { svelte: "5.40.0", tailwindcss: "4.1.0" })).dependsOn).toEqual([
			"tailwindcss",
		]);
		fs.mkdirSync(path.join(cwd, "src"));
		fs.writeFileSync(path.join(cwd, "src/app.css"), `@import "tailwindcss";`);
		expect((await setup(cwd, { svelte: "5.40.0", tailwindcss: "4.1.0" })).dependsOn).toEqual([]);
	});
});

// Contract item 3(b): sv.files() runs its callback synchronously, file after file, so state
// shared between callbacks is reliable. Recorded here because the add-on's design relied on it
// before it switched to an explicit pre-scan (planCss).
it("sv.files() edits synchronously", async () => {
	const cwd = project("vite-js");
	fs.mkdirSync(path.join(cwd, "src/probe"));
	fs.writeFileSync(path.join(cwd, "src/probe/a.css"), "a{}");
	fs.writeFileSync(path.join(cwd, "src/probe/b.css"), "b{}");
	const seen: string[] = [];
	let afterCall: string[] = [];
	const probe = defineAddon({
		id: "probe",
		options: defineAddonOptions().build(),
		run: ({ sv }) => {
			sv.files({ include: ["src/probe/*.css"] }, (_content, file) => {
				seen.push(file);
				return false;
			});
			afterCall = [...seen];
		},
	});
	await add({ cwd, addons: { probe }, options: { probe: {} } });
	expect(afterCall.sort()).toEqual(["src/probe/a.css", "src/probe/b.css"]);
});
