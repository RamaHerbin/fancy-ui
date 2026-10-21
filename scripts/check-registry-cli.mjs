#!/usr/bin/env node
/**
 * Copy-source registry, end to end, the way a user runs it.
 *
 * MANUAL / PRE-RELEASE CHECK. It is not wired in CI: it needs the network
 * (npm registry, scaffolder, the CLI itself), takes minutes, and depends on a
 * prior `pnpm build`. Run it before a release that touches
 * `src/lib/server/registry/`, and whenever a CLI changes behaviour.
 *
 * What it does for one stack:
 *   1. serves the prerendered registry JSON (`pnpm build` output) from a tiny
 *      local static server, rewriting the production site URL to the local one
 *      so `registryDependencies` resolve locally;
 *   2. scaffolds a clean app in a scratch directory OUTSIDE the repository;
 *   3. runs the documented CLI `add` command non-interactively for the items;
 *   4. renders them in a page, type-checks and builds the app (the svelte stack
 *      also server-renders it through `vite preview`).
 *
 * The server, the scratch directory and the process plumbing are shared; what
 * differs per stack (registry path, CLI command, app template, render, verify)
 * lives in the STACKS table below.
 *
 * Usage:
 *   pnpm build
 *   node scripts/check-registry-cli.mjs --stack svelte|react|vue [--items a,b,c | --all]
 *                                       [--workdir <dir>] [--registry-dir <dir>] [--keep]
 *
 *   --stack         which registry and CLI to exercise (required; a bare first
 *                   positional argument is accepted too)
 *   --items         comma-separated item names (default: button,rainbow-button,dialog)
 *   --all           every item of the stack's index (stress test, slower)
 *   --workdir       parent directory that must already exist (default: the system
 *                   temp dir); the run works in a fresh `fancy-registry-cli-*` folder
 *                   inside it and removes only that folder, never the parent
 *   --registry-dir  prerendered pages root that contains `r/` (default:
 *                   .svelte-kit/output/prerendered/pages)
 *   --keep          keep the scratch app for inspection (its path is printed)
 *
 * Exit code 0 only when every step passed; 2 on a usage error.
 *
 * Stacks: svelte, react, vue. The vue flow runs `shadcn-vue init` + `add` in a
 * Vite + Vue + Tailwind app, checks where every file of every requested item
 * (component or shared: utils, internals, sound) landed, then type-checks
 * (vue-tsc), builds and renders the page in headless Chromium.
 */

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import {
	cpSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	realpathSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_ITEMS = ["button", "rainbow-button", "dialog"];

/** Single source of truth: SITE_URL in src/lib/site.ts (read, not copied, so the rewrite never goes stale). */
const SITE_URL = /SITE_URL\s*=\s*["']([^"']+)["']/.exec(
	readFileSync(join(ROOT, "src/lib/site.ts"), "utf8")
)?.[1];

// --- arguments ----------------------------------------------------------------

const args = process.argv.slice(2);
const VALUE_FLAGS = new Set(["--stack", "--items", "--workdir", "--registry-dir"]);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => {
	const i = args.indexOf(`--${name}`);
	if (i < 0) return undefined;
	const v = args[i + 1];
	if (v === undefined || v.startsWith("--")) usage(`--${name} needs a value.`);
	return v;
};
const positional = args.filter((a, i) => !a.startsWith("--") && !VALUE_FLAGS.has(args[i - 1]));

function usage(msg) {
	if (msg) console.error(`check-registry-cli: ${msg}`);
	console.error(
		`Usage: node scripts/check-registry-cli.mjs --stack ${Object.keys(STACKS).join("|")} [--items a,b | --all] [--workdir <dir>] [--registry-dir <dir>] [--keep]`
	);
	process.exit(2);
}

// --- shared plumbing ------------------------------------------------------------

const step = (title) => console.log(`\n== ${title}`);

const write = (dir, rel, text) => {
	const file = join(dir, rel);
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, text);
};

/**
 * Async on purpose: the registry server lives in this process and must keep
 * answering. Output is captured and returned; it is printed only on failure.
 */
function run(cmd, argv, cwd) {
	return new Promise((ok, fail) => {
		console.log(`$ ${cmd} ${argv.join(" ")}`);
		const child = spawn(cmd, argv, { cwd, env: { ...process.env, CI: "1" } });
		let out = "";
		child.stdout.on("data", (d) => (out += d));
		child.stderr.on("data", (d) => (out += d));
		child.on("error", fail);
		child.on("close", (code) => {
			if (code === 0) return ok(out);
			console.error(out);
			fail(new Error(`${cmd} ${argv.slice(0, 3).join(" ")} exited with ${code}`));
		});
	});
}

const stripAnsi = (s) => s.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "");

/** Static server over the prerendered pages (JSON only), with the site URL rewritten. */
function serve(pagesRoot) {
	return new Promise((ok) => {
		const server = createServer((req, res) => {
			const pathname = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
			const file = resolve(join(pagesRoot, pathname));
			if (
				!file.startsWith(pagesRoot + sep) ||
				!file.endsWith(".json") ||
				!existsSync(file) ||
				!statSync(file).isFile()
			) {
				res.writeHead(404).end("not found");
				return;
			}
			const origin = `http://127.0.0.1:${server.address().port}`;
			const body = readFileSync(file, "utf8").split(SITE_URL).join(origin);
			res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" }).end(body);
		});
		server.listen(0, "127.0.0.1", () => ok(server));
	});
}

// --- svelte stack ---------------------------------------------------------------

const SVELTE_PAGE = {
	button: {
		imp: `import { Button } from "$lib/components/ui/fancy/button";`,
		markup: `<Button onclick={() => (open = true)}>Open dialog</Button>`,
		expect: "Open dialog",
	},
	"rainbow-button": {
		imp: `import { RainbowButton } from "$lib/components/ui/fancy/rainbow-button";`,
		markup: `<RainbowButton>Rainbow</RainbowButton>`,
		expect: "Rainbow",
	},
	dialog: {
		imp: `import { Dialog } from "$lib/components/ui/fancy/dialog";`,
		markup: `<Dialog bind:open title="Hello" description="Registry check"><p>Body</p></Dialog>`,
		expect: null, // closed on first render
	},
};

async function scaffoldSvelte(app) {
	const work = dirname(app);
	await run(
		"npx",
		[
			"--yes",
			"sv@latest",
			"create",
			"app",
			"--template",
			"minimal",
			"--types",
			"ts",
			"--no-add-ons",
			"--no-install",
		],
		work
	);
	await run("npx", ["--yes", "sv@latest", "add", "tailwindcss=plugins:none", "--no-install"], app);

	// The CLI reads the `$lib` alias from tsconfig; recent scaffolds no longer
	// declare it, so the harness declares it (a consumer does the same).
	const tsconfigPath = join(app, "tsconfig.json");
	const tsconfig = JSON.parse(readFileSync(tsconfigPath, "utf8"));
	tsconfig.compilerOptions = {
		...tsconfig.compilerOptions,
		paths: { $lib: ["./src/lib"], "$lib/*": ["./src/lib/*"] },
	};
	writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, "\t"));
	const vitePath = join(app, "vite.config.ts");
	const viteSource = readFileSync(vitePath, "utf8");
	if (!viteSource.includes("sveltekit({")) {
		throw new Error(
			"vite.config.ts has no literal `sveltekit({`; the $lib alias cannot be injected (scaffold changed?)"
		);
	}
	writeFileSync(
		vitePath,
		viteSource.replace("sveltekit({", "sveltekit({\n\t\t\talias: { $lib: 'src/lib' },")
	);
	write(
		app,
		"components.json",
		JSON.stringify(
			{
				$schema: "https://shadcn-svelte.com/schema.json",
				tailwind: { css: "src/routes/layout.css", baseColor: "neutral" },
				aliases: {
					components: "$lib/components",
					utils: "$lib/utils",
					ui: "$lib/components/ui",
					hooks: "$lib/hooks",
					lib: "$lib",
				},
				typescript: true,
				registry: "https://shadcn-svelte.com/registry",
			},
			null,
			"\t"
		)
	);
	write(
		app,
		"src/lib/utils.ts",
		`import { clsx, type ClassValue } from "clsx";\nimport { twMerge } from "tailwind-merge";\n\nexport function cn(...inputs: ClassValue[]) {\n\treturn twMerge(clsx(inputs));\n}\n`
	);
	await run("pnpm", ["install"], app);
	await run("pnpm", ["add", "clsx", "tailwind-merge"], app);
}

async function addSvelte(app, urls) {
	const out = await run(
		"npx",
		["--yes", "shadcn-svelte@latest", "add", ...urls, "--yes", "--overwrite"],
		app
	);
	console.log(
		stripAnsi(out)
			.split("\n")
			.filter((l) => /installed|Success/.test(l))
			.join("\n")
	);
}

function renderSvelte(app, items) {
	const shown = items.filter((n) => SVELTE_PAGE[n]);
	write(
		app,
		"src/routes/+page.svelte",
		`<script lang="ts">\n\t${shown.map((n) => SVELTE_PAGE[n].imp).join("\n\t")}\n\tlet open = $state(false);\n</script>\n\n<main>\n\t${shown.map((n) => SVELTE_PAGE[n].markup).join("\n\t")}\n</main>\n`
	);
}

/** Type-check (when the stack has one) then build; labels, commands and output folder come from the STACKS entry. */
async function typecheckAndBuild(app, stack) {
	if (stack.typecheck) {
		step(stack.typecheck.label);
		const [cmd, ...rest] = stack.typecheck.cmd;
		console.log((await run(cmd, rest, app)).split("\n").slice(-3).join("\n"));
	}
	step(stack.build.label);
	const [cmd, ...rest] = stack.build.cmd;
	await run(cmd, rest, app);
	if (!existsSync(join(app, stack.outDir))) {
		throw new Error(`${stack.build.label}: no ${stack.outDir}/ after the build`);
	}
}

async function verifySvelte(app, items, cleanup, { stack }) {
	await typecheckAndBuild(app, stack);

	step("server-side render through vite preview");
	const port = 4700 + Math.floor(Math.random() * 200);
	const preview = spawn(
		"pnpm",
		["exec", "vite", "preview", "--port", String(port), "--strictPort"],
		{ cwd: app, stdio: "ignore" }
	);
	cleanup.push(() => preview.kill());
	let html = "";
	for (let i = 0; i < 40 && !html; i++) {
		await new Promise((r) => setTimeout(r, 500));
		try {
			const res = await fetch(`http://localhost:${port}/`);
			if (res.ok) html = await res.text();
		} catch {}
	}
	if (!html) throw new Error("preview server never answered");
	for (const n of items.filter((n) => SVELTE_PAGE[n])) {
		const needle = SVELTE_PAGE[n].expect;
		if (needle && !html.includes(needle))
			throw new Error(`"${needle}" (${n}) missing from the rendered page`);
	}
	console.log("rendered page contains the components");
}

// --- react stack ----------------------------------------------------------------

async function scaffoldReact(app) {
	write(
		app,
		"package.json",
		JSON.stringify(
			{
				name: "registry-cli-react",
				private: true,
				type: "module",
				scripts: { build: "tsc --noEmit && vite build" },
				dependencies: { react: "^19.1.0", "react-dom": "^19.1.0" },
				devDependencies: {
					"@tailwindcss/vite": "^4.1.0",
					"@types/react": "^19.1.0",
					"@types/react-dom": "^19.1.0",
					"@vitejs/plugin-react": "^4.6.0",
					tailwindcss: "^4.1.0",
					typescript: "^5.8.0",
					vite: "^6.3.0",
				},
			},
			null,
			2
		)
	);
	write(
		app,
		"tsconfig.json",
		JSON.stringify(
			{
				compilerOptions: {
					target: "ES2022",
					lib: ["ES2022", "DOM", "DOM.Iterable"],
					module: "ESNext",
					moduleResolution: "bundler",
					jsx: "react-jsx",
					strict: true,
					noEmit: true,
					skipLibCheck: true,
					baseUrl: ".",
					paths: { "@/*": ["./src/*"] },
				},
				include: ["src"],
			},
			null,
			2
		)
	);
	write(
		app,
		"vite.config.ts",
		`import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
});
`
	);
	write(
		app,
		"components.json",
		JSON.stringify(
			{
				$schema: "https://ui.shadcn.com/schema.json",
				style: "new-york",
				rsc: false,
				tsx: true,
				tailwind: { config: "", css: "src/index.css", baseColor: "neutral", cssVariables: true },
				aliases: {
					components: "@/components",
					utils: "@/lib/utils",
					ui: "@/components/ui",
					lib: "@/lib",
					hooks: "@/hooks",
				},
			},
			null,
			2
		)
	);
	write(app, "src/index.css", '@import "tailwindcss";\n');
	write(
		app,
		"index.html",
		'<div id="root"></div><script type="module" src="/src/main.tsx"></script>\n'
	);
	await run("npm", ["install", "--no-audit", "--no-fund"], app);
}

async function addReact(app, urls) {
	for (const url of urls) {
		await run("npx", ["--yes", "shadcn@latest", "add", url, "--yes", "--overwrite"], app);
	}
}

/** Props for components that render nothing useful without them. */
const REACT_JSX = {
	dialog: (X) => `<${X} open={false} onOpenChange={() => {}} title="Hello">Body</${X}>`,
};

function renderReact(app, items) {
	const pascal = (s) => s.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase());
	const imports = items
		.map((n) => `import { ${pascal(n)} } from "@/components/ui/fancy/components/${n}";`)
		.join("\n");
	const jsx = items
		.map((n) => `\t\t${(REACT_JSX[n] ?? ((C) => `<${C}>${n}</${C}>`))(pascal(n))}`)
		.join("\n");
	write(
		app,
		"src/main.tsx",
		`import { createRoot } from "react-dom/client";
import "./index.css";
${imports}

createRoot(document.getElementById("root")!).render(
	<main>
${jsx}
	</main>
);
`
	);
}

async function verifyReact(app, items, cleanup, { stack }) {
	step("install the dependencies the items declared");
	await run("npm", ["install", "--no-audit", "--no-fund"], app);
	await typecheckAndBuild(app, stack);
}

// --- vue stack -------------------------------------------------------------------

const VUE_APP_FILES = {
	"package.json": JSON.stringify(
		{
			name: "registry-cli-vue",
			private: true,
			version: "0.0.0",
			type: "module",
			scripts: { typecheck: "vue-tsc --noEmit -p tsconfig.app.json", build: "vite build" },
			dependencies: { vue: "^3.5.0" },
			devDependencies: {
				"@tailwindcss/vite": "^4.1.0",
				"@types/node": "^22.0.0",
				"@vitejs/plugin-vue": "^6.0.0",
				// A local install: a shared npx cache once corrupted the CLI (ENOTEMPTY).
				"shadcn-vue": "latest",
				tailwindcss: "^4.1.0",
				typescript: "~5.9.0",
				vite: "^7.0.0",
				"vue-tsc": "^3.0.0",
			},
		},
		null,
		2
	),
	// pnpm exits 1 on ignored build scripts; esbuild is the only one here.
	"pnpm-workspace.yaml": "allowBuilds:\n  esbuild: true\n",
	"index.html": `<!doctype html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>registry cli check</title>
	</head>
	<body>
		<div id="app"></div>
		<script type="module" src="/src/main.ts"></script>
	</body>
</html>
`,
	"vite.config.ts": `import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
	plugins: [vue(), tailwindcss()],
	resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
});
`,
	"tsconfig.json": JSON.stringify(
		{
			files: [],
			references: [{ path: "./tsconfig.app.json" }],
			compilerOptions: { baseUrl: ".", paths: { "@/*": ["./src/*"] } },
		},
		null,
		2
	),
	"tsconfig.app.json": JSON.stringify(
		{
			compilerOptions: {
				target: "ES2022",
				module: "ESNext",
				moduleResolution: "bundler",
				lib: ["ES2022", "DOM", "DOM.Iterable"],
				strict: true,
				noEmit: true,
				skipLibCheck: true,
				isolatedModules: true,
				verbatimModuleSyntax: true,
				types: ["vite/client"],
				baseUrl: ".",
				paths: { "@/*": ["./src/*"] },
			},
			include: ["src/**/*.ts", "src/**/*.vue", "vite.config.ts"],
		},
		null,
		2
	),
	"src/env.d.ts": `/// <reference types="vite/client" />\n`,
	"src/style.css": `@import "tailwindcss";\n`,
	"src/main.ts": `import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";

createApp(App).mount("#app");
`,
	"src/App.vue": `<script setup lang="ts">
</script>

<template>
	<div>scaffold</div>
</template>
`,
};

const VUE_PAGE = {
	button: {
		imp: `import { Button } from "@/components/ui/fancy/components/button";`,
		markup: `<Button data-check="button">Plain button</Button>`,
		marker: "button",
	},
	"rainbow-button": {
		imp: `import { RainbowButton } from "@/components/ui/fancy/components/rainbow-button";`,
		markup: `<RainbowButton data-check="rainbow-button">Rainbow</RainbowButton>`,
		marker: "rainbow-button",
	},
	// The trigger is the Button when it is installed, a native button otherwise.
	dialog: {
		imp: `import { Dialog } from "@/components/ui/fancy/components/dialog";`,
		markup: (
			items
		) => `<Dialog v-model:open="open" title="Check dialog" description="Opened from the page">
			<template #trigger>
				${items.includes("button") ? `<Button data-check="dialog-trigger">Open dialog</Button>` : `<button data-check="dialog-trigger">Open dialog</button>`}
			</template>
			<p>Dialog body</p>
		</Dialog>`,
		marker: "dialog-trigger",
	},
};

async function scaffoldVue(app) {
	for (const [rel, text] of Object.entries(VUE_APP_FILES)) write(app, rel, text);
	// pnpm exits 1 on ignored build scripts; the workspace file allows esbuild.
	await run("pnpm", ["install"], app);
	await run(
		"pnpm",
		["exec", "shadcn-vue", "init", "-d", "-y", "-t", "vite", "--base-color", "neutral"],
		app
	);
}

async function addVue(app, urls) {
	await run("pnpm", ["exec", "shadcn-vue", "add", "-y", "-o", ...urls], app);
}

function renderVue(app, items) {
	const shown = items.filter((n) => VUE_PAGE[n]);
	const imports = shown.map((n) => VUE_PAGE[n].imp);
	if (shown.includes("dialog") && items.includes("button") && !shown.includes("button"))
		imports.push(VUE_PAGE.button.imp);
	const body = shown
		.map((n) => {
			const m = VUE_PAGE[n].markup;
			return `\t\t${typeof m === "function" ? m(items) : m}`;
		})
		.join("\n");
	write(
		app,
		"src/App.vue",
		`<script setup lang="ts">
import { ref } from "vue";
${imports.join("\n")}

const open = ref(false);
void open;
</script>

<template>
	<main class="p-8 flex flex-col gap-4 items-start">
${body}
	</main>
</template>
`
	);
}

function walk(dir, out = []) {
	for (const e of readdirSync(dir, { withFileTypes: true })) {
		const p = join(dir, e.name);
		if (e.isDirectory()) walk(p, out);
		else out.push(p);
	}
	return out;
}

/** Where every file of every requested item must land, and that it imports only declared packages. */
function checkVuePlacement(app, items, pagesRoot, stack) {
	step("placement of the copied files");
	const fancy = join(app, stack.fancyDir);
	const problems = [];
	if (!existsSync(fancy)) problems.push(`nothing under ${stack.fancyDir}`);
	for (const name of items) {
		const json = JSON.parse(readFileSync(join(pagesRoot, stack.registry, `${name}.json`), "utf8"));
		const files = (json.files ?? []).map((f) => f.path);
		if (files.length === 0) problems.push(`${name}: no files in the item`);
		for (const f of files) {
			if (
				!f.startsWith(stack.pathPrefix) ||
				!existsSync(join(fancy, f.slice(stack.pathPrefix.length)))
			)
				problems.push(`${name}: ${f} did not land under ${stack.fancyDir}`);
		}
		console.log(`${name}: ${files.length} file(s)`);
	}
	for (const p of ["fancy", "internals", "sound", "utils.ts"])
		if (existsSync(join(app, p))) problems.push(`stray ${p} at the project root`);
	if (existsSync(fancy)) {
		const copied = walk(fancy);
		for (const f of copied)
			if (/\$[A-Z_]+\$/.test(readFileSync(f, "utf8"))) problems.push(`placeholder left in ${f}`);
		const pkg = JSON.parse(readFileSync(join(app, "package.json"), "utf8"));
		const declared = { ...pkg.dependencies, ...pkg.devDependencies };
		for (const f of copied.filter((x) => /\.(vue|ts)$/.test(x))) {
			for (const spec of importedSpecifiers(readFileSync(f, "utf8"))) {
				if (/^(\.|@\/|#|~)/.test(spec) || spec.startsWith("node:") || spec === "vue") continue;
				const name = spec.startsWith("@")
					? spec.split("/").slice(0, 2).join("/")
					: spec.split("/")[0];
				if (!declared[name] && !declared[`@types/${name}`])
					problems.push(`${f} imports ${name}, which is not a dependency`);
			}
		}
	}
	if (problems.length > 0) throw new Error(`placement check failed:\n  ${problems.join("\n  ")}`);
	console.log("every file landed; every imported package is declared");
}

const MIME = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json",
	".svg": "image/svg+xml",
};

/** Static server over a built app folder (SPA output). */
function serveDir(root) {
	return new Promise((ok) => {
		const server = createServer(async (req, res) => {
			try {
				let path = normalize(decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname));
				if (path.endsWith(sep)) path += "index.html";
				const file = join(root, path);
				if (file !== root && !file.startsWith(root + sep)) {
					res.writeHead(403).end();
					return;
				}
				res
					.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" })
					.end(await readFile(file));
			} catch {
				res.writeHead(404).end("not found");
			}
		});
		server.listen(0, "127.0.0.1", () => ok(server));
	});
}

async function verifyVue(app, items, cleanup, { stack, pagesRoot }) {
	checkVuePlacement(app, items, pagesRoot, stack);
	await typecheckAndBuild(app, stack);

	step("render in headless Chromium");
	const require = createRequire(join(ROOT, "package.json"));
	const { chromium } = require("@playwright/test");
	const server = await serveDir(join(app, stack.outDir));
	cleanup.push(() => server.close());
	const browser = await chromium.launch();
	cleanup.push(() => browser.close());
	const page = await browser.newPage();
	const errors = [];
	page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
	page.on("pageerror", (e) => errors.push(String(e)));
	await page.goto(`http://127.0.0.1:${server.address().port}/`);
	for (const n of items.filter((n) => VUE_PAGE[n])) {
		const marker = VUE_PAGE[n].marker;
		await page.waitForSelector(`[data-check="${marker}"]`, { timeout: 8000 }).catch(() => {
			throw new Error(`[data-check="${marker}"] (${n}) never rendered`);
		});
	}
	if (items.includes("dialog")) {
		await page.click('[data-check="dialog-trigger"]');
		await page.waitForSelector('[role="dialog"]', { timeout: 5000 }).catch(() => {
			throw new Error("the dialog did not open from its trigger");
		});
	}
	if (errors.length > 0) throw new Error(`console errors while rendering:\n${errors.join("\n")}`);
	console.log("rendered page contains the components");
}

/**
 * Every module specifier a file imports: static (also multi-line, side-effect and
 * re-exports) and dynamic `import("x")`. Comments are blanked first so a
 * commented-out import is not read as one.
 */
export function importedSpecifiers(text) {
	const code = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
	const found = new Set();
	for (const m of code.matchAll(
		/(?:^|[;}])\s*(?:import|export)\s+(?:type\s+)?(?:[^"';]*?\bfrom\s*)?["']([^"']+)["']/gm
	))
		found.add(m[1]);
	for (const m of code.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*[,)]/g)) found.add(m[1]);
	return [...found];
}

// --- the per-stack table ----------------------------------------------------------

const STACKS = {
	svelte: {
		registry: "r/svelte",
		label: "SvelteKit",
		cli: "shadcn-svelte add",
		typecheck: { label: "svelte-check", cmd: ["pnpm", "check"] },
		build: { label: "vite build", cmd: ["pnpm", "build"] },
		outDir: ".svelte-kit/output",
		scaffold: scaffoldSvelte,
		add: addSvelte,
		render: renderSvelte,
		verify: verifySvelte,
	},
	react: {
		registry: "r",
		label: "React + Vite",
		cli: "shadcn add",
		typecheck: null,
		build: { label: "tsc + vite build", cmd: ["npm", "run", "build"] },
		outDir: "dist",
		scaffold: scaffoldReact,
		add: addReact,
		render: renderReact,
		verify: verifyReact,
	},
	vue: {
		registry: "r/vue",
		label: "Vue + Vite",
		cli: "shadcn-vue add",
		typecheck: { label: "vue-tsc type check", cmd: ["pnpm", "run", "typecheck"] },
		build: { label: "vite build", cmd: ["pnpm", "run", "build"] },
		outDir: "dist",
		fancyDir: "src/components/ui/fancy",
		pathPrefix: "src/components/ui/fancy/",
		scaffold: scaffoldVue,
		add: addVue,
		render: renderVue,
		verify: verifyVue,
	},
};

async function main() {
	// --- main -------------------------------------------------------------------------

	if (!SITE_URL) {
		console.error("check-registry-cli: could not read SITE_URL from src/lib/site.ts.");
		process.exit(2);
	}
	const stackName = value("stack") ?? positional[0];
	if (!stackName) usage("missing --stack.");
	const stack = STACKS[stackName];
	if (!stack)
		usage(`stack "${stackName}" is not automated (known: ${Object.keys(STACKS).join(", ")}).`);

	const pagesRoot = resolve(
		value("registry-dir") ?? join(ROOT, ".svelte-kit/output/prerendered/pages")
	);
	const indexFile = join(pagesRoot, stack.registry, "registry.json");
	if (!existsSync(indexFile)) {
		console.error(
			`check-registry-cli: no registry index at ${indexFile}. Run \`pnpm build\` first, or pass --registry-dir.`
		);
		process.exit(2);
	}
	const index = JSON.parse(readFileSync(indexFile, "utf8"));
	const known = new Set(index.items.map((i) => i.name));
	const items = flag("all")
		? index.items.map((i) => i.name)
		: (value("items")?.split(",").filter(Boolean) ?? DEFAULT_ITEMS);
	const missing = items.filter((n) => !known.has(n));
	if (items.length === 0) usage("no items.");
	if (missing.length > 0) {
		console.error(
			`check-registry-cli: not in the ${stackName} registry index: ${missing.join(", ")}`
		);
		process.exit(2);
	}

	// A user-supplied --workdir is only a parent: it must exist, is never created or
	// removed, and the run works in a fresh mkdtemp folder inside it.
	const userWork = value("workdir");
	if (userWork && !existsSync(resolve(userWork))) usage(`--workdir ${userWork} does not exist.`);
	const parent = realpathSync(userWork ? resolve(userWork) : tmpdir());
	const realRoot = realpathSync(ROOT);
	if (parent === realRoot || parent.startsWith(realRoot + sep)) {
		console.error("check-registry-cli: the scratch app must live outside the repository.");
		process.exit(2);
	}
	const work = mkdtempSync(join(parent, "fancy-registry-cli-"));
	const app = join(work, "app");

	const server = await serve(pagesRoot);
	const base = `http://127.0.0.1:${server.address().port}/${stack.registry}`;
	const cleanup = [() => server.close()];
	let failed = false;
	try {
		step(`scaffold a clean ${stack.label} app in ${app}`);
		await stack.scaffold(app);

		step(`${stack.cli} (${items.length} item${items.length === 1 ? "" : "s"}) from ${base}`);
		await stack.add(
			app,
			items.map((n) => `${base}/${n}.json`)
		);

		step("render the components in a page");
		stack.render(app, items);

		await stack.verify(app, items, cleanup, { stack, pagesRoot });
		console.log(
			`\ncheck-registry-cli: OK (${stackName}): ${items.length} item(s) installed, checked and built.`
		);
	} catch (e) {
		failed = true;
		console.error(
			`\ncheck-registry-cli: FAIL (${stackName}): ${e instanceof Error ? e.message : String(e)}`
		);
	} finally {
		for (const fn of cleanup.reverse()) await fn();
		if (flag("keep") || failed) console.log(`scratch app kept at ${app}`);
		// Only the folder this run created is removed, never a user-supplied parent.
		else rmSync(work, { recursive: true, force: true });
	}
	process.exit(failed ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
