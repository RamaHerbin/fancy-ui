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
 *   3. runs the scenarios below with the pinned CLI (CLI_VERSIONS);
 *   4. renders the components in a page, type-checks and builds the app (the
 *      svelte stack also server-renders it through `vite preview`, vue renders
 *      it in headless Chromium).
 *
 * Scenarios (default: all; `--scenario s1,s3` picks some). App A uses the
 * default aliases and runs S1–S4 and S6 in order; S5 scaffolds app B.
 *   S1  starter set in one add: button (simple), rainbow-button (animated
 *       effect), confetti (npm dependency + @types)
 *   S2  dialog then context-menu in two adds, both needing the shared
 *       internals: one copy of each shared file, none changed by the second
 *       add; S2n records whether that runs unattended without --overwrite
 *   S3  edit an installed shared file and a component file, re-add without
 *       --overwrite (stdin answers "n"; a CLI that waits past the timeout is
 *       MANUAL) then with it (the edits must be gone)
 *   S4  the consumer's own utils file (extra export) stays untouched; a file
 *       already at a target path is not overwritten without --overwrite
 *   S5  non-default `ui` alias: placement follows it, type check + build pass
 *       (vue: a known limitation, recorded as LIMITATION)
 *   S6  no installed file imports fancy-ui-svelte/-react/-vue/-cameleon, and
 *       the app neither declares nor installs one
 * Each result is PASS, FAIL, MANUAL or LIMITATION; only FAIL fails the run.
 * `--items` / `--all` run the original single-add flow instead (stress test).
 *
 * The server, the scratch directory and the process plumbing are shared; what
 * differs per stack (registry path, CLI command, app template, render, verify,
 * where files land) lives in the STACKS table below.
 *
 * Usage:
 *   pnpm build
 *   node scripts/check-registry-cli.mjs --stack svelte|react|vue
 *                                       [--scenario all|s1,…,s6 | --items a,b,c | --all]
 *                                       [--cli-version <v>] [--report <file.json>]
 *                                       [--workdir <dir>] [--registry-dir <dir>] [--keep]
 *
 *   --stack         which registry and CLI to exercise (required; a bare first
 *                   positional argument is accepted too)
 *   --scenario      scenarios to run (default all)
 *   --items         single-add mode with these items (comma-separated)
 *   --all           single-add mode with every item of the stack's index
 *   --cli-version   run the stack's CLI at this version instead of the pin
 *   --report        also write the scenario results as JSON
 *   --workdir       parent directory that must already exist (default: the system
 *                   temp dir); the run works in a fresh `fancy-registry-cli-*` folder
 *                   inside it and removes only that folder, never the parent
 *   --registry-dir  prerendered pages root that contains `r/` (default:
 *                   .svelte-kit/output/prerendered/pages)
 *   --keep          keep the scratch apps for inspection (their path is printed)
 *
 * Exit code 0 only when every step passed; 2 on a usage error.
 *
 * Stacks: svelte, react, vue. The vue flow runs `shadcn-vue init` + `add` in a
 * Vite + Vue + Tailwind app, checks where every file of every requested item
 * (component or shared: utils, internals, sound) landed, then type-checks
 * (vue-tsc), builds and renders the page in headless Chromium.
 */

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
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
import { basename, dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * The CLI (and scaffolder) versions this check runs, pinned so a result names
 * what it was run against. The docs keep telling users `@latest`
 * (src/lib/copy-source.ts); bump these after re-running the check against a
 * new CLI. `--cli-version <v>` overrides the stack's CLI for one run.
 * Last full run: 2026-10-22.
 */
export const CLI_VERSIONS = Object.freeze({
	shadcn: "4.22.1",
	"shadcn-svelte": "1.7.0",
	"shadcn-vue": "2.8.2",
	/** SvelteKit scaffolder used by the svelte stack. */
	sv: "1.1.1",
});
const DEFAULT_ITEMS = ["button", "rainbow-button", "dialog"];

/** Single source of truth: SITE_URL in src/lib/site.ts (read, not copied, so the rewrite never goes stale). */
const SITE_URL = /SITE_URL\s*=\s*["']([^"']+)["']/.exec(
	readFileSync(join(ROOT, "src/lib/site.ts"), "utf8")
)?.[1];

// --- arguments ----------------------------------------------------------------

const args = process.argv.slice(2);
const VALUE_FLAGS = new Set([
	"--stack",
	"--items",
	"--workdir",
	"--registry-dir",
	"--cli-version",
	"--scenario",
	"--report",
]);
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
		`Usage: node scripts/check-registry-cli.mjs --stack ${Object.keys(STACKS).join("|")} [--scenario all|s1,s2,… | --items a,b | --all] [--cli-version <v>] [--workdir <dir>] [--registry-dir <dir>] [--report <file>] [--keep]`
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
 *
 * Options: `input` is written to stdin, then stdin is closed (default: closed
 * at once, so a prompt sees end-of-input instead of hanging); `timeoutMs`
 * kills the process (default 15 min); `allowFail` resolves with
 * `{ code, out, timedOut }` instead of rejecting.
 */
function run(cmd, argv, cwd, { input = "", timeoutMs = 15 * 60_000, allowFail = false } = {}) {
	return new Promise((ok, fail) => {
		console.log(`$ ${cmd} ${argv.join(" ")}`);
		const child = spawn(cmd, argv, { cwd, env: { ...process.env, CI: "1" } });
		let out = "";
		let timedOut = false;
		const timer = setTimeout(() => {
			timedOut = true;
			child.kill("SIGKILL");
		}, timeoutMs);
		child.stdout.on("data", (d) => (out += d));
		child.stderr.on("data", (d) => (out += d));
		child.stdin.on("error", () => {});
		child.stdin.end(input);
		child.on("error", (e) => {
			clearTimeout(timer);
			fail(e);
		});
		child.on("close", (code) => {
			clearTimeout(timer);
			if (allowFail) return ok({ code, out, timedOut });
			if (code === 0) return ok(out);
			console.error(out);
			fail(
				new Error(
					`${cmd} ${argv.slice(0, 3).join(" ")} ${timedOut ? "timed out" : `exited with ${code}`}`
				)
			);
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
			`sv@${CLI_VERSIONS.sv}`,
			"create",
			basename(app),
			"--template",
			"minimal",
			"--types",
			"ts",
			"--no-add-ons",
			"--no-install",
		],
		work
	);
	await run(
		"npx",
		["--yes", `sv@${CLI_VERSIONS.sv}`, "add", "tailwindcss=plugins:none", "--no-install"],
		app
	);

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

async function addSvelte(app, urls, opts = {}) {
	return cliAdd(
		app,
		["npx", "--yes", `shadcn-svelte@${cliVersion("shadcn-svelte")}`, "add", ...urls, "--yes"],
		"--overwrite",
		opts
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

async function addReact(app, urls, opts = {}) {
	return cliAdd(
		app,
		["npx", "--yes", `shadcn@${cliVersion("shadcn")}`, "add", ...urls, "--yes"],
		"--overwrite",
		opts
	);
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
				"shadcn-vue": "__SHADCN_VUE_VERSION__",
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
	for (const [rel, text] of Object.entries(VUE_APP_FILES))
		write(app, rel, text.replace("__SHADCN_VUE_VERSION__", cliVersion("shadcn-vue")));
	// pnpm exits 1 on ignored build scripts; the workspace file allows esbuild.
	await run("pnpm", ["install"], app);
	await run(
		"pnpm",
		["exec", "shadcn-vue", "init", "-d", "-y", "-t", "vite", "--base-color", "neutral"],
		app
	);
}

async function addVue(app, urls, opts = {}) {
	return cliAdd(app, ["pnpm", "exec", "shadcn-vue", "add", "-y", ...urls], "-o", opts);
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

// --- CLI calls ------------------------------------------------------------------

/** The pinned version of a CLI, or the `--cli-version` override for the stack's own CLI. */
function cliVersion(name) {
	const override = value("cli-version");
	const own = { svelte: "shadcn-svelte", react: "shadcn", vue: "shadcn-vue" }[
		value("stack") ?? positional[0]
	];
	return override && name === own ? override : CLI_VERSIONS[name];
}

/** Answers fed to a non-overwrite `add`: "no" to every overwrite prompt. */
const NO_TO_PROMPTS = "n\n".repeat(50);

/**
 * One `add` call. With `overwrite` the stack's overwrite flag is appended and
 * a failure throws. Without it, stdin answers "no" to any prompt, the call is
 * bounded by a timeout, and `{ code, out, timedOut }` is returned for the
 * caller to judge.
 */
async function cliAdd(app, [cmd, ...argv], overwriteFlag, { overwrite = true, timeoutMs } = {}) {
	if (overwrite) {
		const out = await run(cmd, [...argv, overwriteFlag], app);
		console.log(
			stripAnsi(out)
				.split("\n")
				.filter((l) => /installed|Success|Created|Updated|Skipped/i.test(l))
				.join("\n")
		);
		return { code: 0, out, timedOut: false };
	}
	const res = await run(cmd, argv, app, {
		input: NO_TO_PROMPTS,
		timeoutMs: timeoutMs ?? 180_000,
		allowFail: true,
	});
	const text = stripAnsi(res.out);
	const lines = text
		.split("\n")
		.map((l) => l.trim())
		.filter(Boolean);
	console.log(lines.slice(-8).join("\n"));
	return { ...res, prompted: PROMPT_TEXT.test(text) };
}

/** What the three CLIs print when they stop to ask about an existing file. */
const PROMPT_TEXT = /overwrite\?|already exist/i;

// --- scenarios -------------------------------------------------------------------

/** fancy-ui's own npm packages; the copied code must never import one. */
export const OWN_PACKAGE = /^fancy-ui-(svelte|react|vue|cameleon|nuxt)(\/|$)/;

/** Installed files (absolute paths) that import one of fancy-ui's own packages. */
export function selfImports(files, readText) {
	const hits = [];
	for (const f of files) {
		if (!/\.(ts|tsx|js|svelte|vue)$/.test(f)) continue;
		for (const spec of importedSpecifiers(readText(f))) {
			if (OWN_PACKAGE.test(spec)) hits.push(`${f} → ${spec}`);
		}
	}
	return hits;
}

/** Appends a marker in the file's own comment syntax. */
export function markerFor(file) {
	return /\.(svelte|vue)$/.test(file)
		? "\n<!-- consumer-edit-marker -->\n"
		: "\n/* consumer-edit-marker */\n";
}

const sha = (text) => createHash("sha256").update(text).digest("hex");

function snapshotTree(dir) {
	const map = new Map();
	if (!existsSync(dir)) return map;
	for (const f of walk(dir)) map.set(f, sha(readFileSync(f)));
	return map;
}

/** Every file of the app outside dependency and build folders. */
function appFiles(app) {
	const out = [];
	const skip = new Set(["node_modules", ".svelte-kit", "dist", ".git"]);
	(function rec(dir) {
		for (const e of readdirSync(dir, { withFileTypes: true })) {
			if (skip.has(e.name)) continue;
			const p = join(dir, e.name);
			if (e.isDirectory()) rec(p);
			else out.push(p);
		}
	})(app);
	return out;
}

/**
 * A run of named scenarios against one stack. Each result is PASS, FAIL,
 * MANUAL (the CLI needs a human: interactive prompt) or LIMITATION (a known,
 * documented gap, not a regression).
 */
function scenarioRunner(ctx) {
	const results = [];
	const record = (id, title, status, note = "") => {
		results.push({ id, title, status, note });
		console.log(`-> ${id} ${status}${note ? `: ${note}` : ""}`);
	};

	/** The item JSON, from the served snapshot. */
	const item = (name) =>
		JSON.parse(readFileSync(join(ctx.pagesRoot, ctx.stack.registry, `${name}.json`), "utf8"));
	/** The item and every item it depends on, transitively. */
	const closureOf = (names) => {
		const seen = new Set();
		const visit = (n) => {
			if (seen.has(n)) return;
			seen.add(n);
			for (const url of item(n).registryDependencies ?? [])
				visit(url.split("/").pop().slice(0, -5));
		};
		names.forEach(visit);
		return [...seen].sort();
	};
	/** Where a file of an item lands, relative to the app, for a given `ui` directory. */
	const landing = (file, uiRoot = ctx.stack.uiRoot) => join(uiRoot, ctx.stack.landRel(file));
	const url = (name) => `${ctx.base}/${name}.json`;

	/** Files of `names` (closure included) that did not land, or landed more than once. */
	function placementProblems(app, names, uiRoot) {
		const problems = [];
		const all = appFiles(app).map((f) =>
			f
				.slice(app.length + 1)
				.split(sep)
				.join("/")
		);
		for (const name of closureOf(names)) {
			for (const file of item(name).files) {
				const rel = landing(file, uiRoot);
				if (!existsSync(join(app, rel))) problems.push(`${name}: ${rel} missing`);
				const tail = `/${ctx.stack.landRel(file)}`;
				const copies = all.filter((p) => p.endsWith(tail) || p === tail.slice(1));
				if (copies.length > 1)
					problems.push(`${name}: ${copies.length} copies of ${tail.slice(1)}`);
			}
		}
		return problems;
	}

	/** Landed text vs the item's content, modulo the CLI's documented rewrites. */
	function contentMismatches(app, names) {
		const norm = (t) =>
			t
				.replace(/^\s*["']use client["'];?\s*\n+/, "")
				.split("$UTILS$")
				.join(ctx.stack.utilsAlias ?? "$UTILS$")
				.replace(/\r\n/g, "\n")
				.trimEnd();
		const bad = [];
		for (const name of names) {
			for (const file of item(name).files) {
				const path = join(app, landing(file));
				if (!existsSync(path)) continue;
				if (norm(readFileSync(path, "utf8")) !== norm(file.content)) bad.push(landing(file));
			}
		}
		return bad;
	}

	return {
		results,
		record,
		item,
		closureOf,
		landing,
		url,
		placementProblems,
		contentMismatches,
	};
}

/**
 * The scenario suite, one stack. App A (default aliases) runs S1–S4 and S6
 * in order and is then rendered and built; S5 scaffolds app B with a
 * non-default `ui` alias.
 */
async function runScenarios({ stack, stackName, pagesRoot, base, work, wanted, cleanup }) {
	const r = scenarioRunner({ stack, pagesRoot, base });
	const want = (id) => wanted.has("all") || wanted.has(id);
	const app = join(work, "app");

	// App A hosts every scenario but S5; a run of S5 alone skips it.
	const appA = ["s1", "s2", "s3", "s4", "s6"].some(want);
	if (appA) {
		step(`scaffold a clean ${stack.label} app in ${app}`);
		await stack.scaffold(app);
	}

	// S4 (part 1): the consumer's own files, planted before any add.
	const utilsFile = join(app, stack.utilsPath);
	if (appA && want("s4")) {
		mkdirSync(dirname(utilsFile), { recursive: true });
		const own = existsSync(utilsFile) ? readFileSync(utilsFile, "utf8") : "";
		writeFileSync(utilsFile, `${own}\nexport const consumerOwned = true;\n`);
	}
	const utilsBefore = appA && existsSync(utilsFile) ? sha(readFileSync(utilsFile)) : null;

	const starter = ["button", "rainbow-button", "confetti"];
	const installed = new Set();

	// S1: the starter set in one call (simple, animated effect, npm dependency + types).
	if (want("s1")) {
		step(
			"S1 starter set: button (simple) + rainbow-button (animated) + confetti (npm dep + @types), one call"
		);
		await stack.add(app, starter.map(r.url));
		starter.forEach((n) => installed.add(n));
		const problems = r.placementProblems(app, starter);
		const pkg = JSON.parse(readFileSync(join(app, "package.json"), "utf8"));
		const declared = { ...pkg.dependencies, ...pkg.devDependencies };
		for (const dep of ["canvas-confetti", "@types/canvas-confetti"])
			if (!declared[dep]) problems.push(`${dep} not added to package.json`);
		// The CLIs reformat some files (React drops a leading block comment,
		// Vue re-indents): reported, not failed.
		const drift = r.contentMismatches(app, r.closureOf(starter));
		r.record(
			"S1",
			"starter set (simple, animated, npm dep), one add",
			problems.length ? "FAIL" : "PASS",
			problems.length
				? problems.join("; ")
				: `${r.closureOf(starter).length} items landed${drift.length ? `; ${drift.length} file(s) reformatted by the CLI, e.g. ${drift.slice(0, 2).join(", ")}` : ", content identical to the items"}`
		);
	}

	/**
	 * An add without --overwrite. When the CLI stopped at a prompt and wrote
	 * nothing (Svelte: it asks about every already-installed dependency item,
	 * and a closed stdin cancels with exit 0), `fellBack` is set and the add is
	 * redone with --overwrite so the scenario can go on.
	 */
	async function addWithoutOverwrite(name) {
		const res = await stack.add(app, [r.url(name)], { overwrite: false });
		const landed = r.item(name).files.every((f) => existsSync(join(app, r.landing(f))));
		if (res.timedOut || !landed) {
			await stack.add(app, [r.url(name)]);
			return { ...res, fellBack: true };
		}
		if (res.code !== 0) {
			console.error(res.out);
			throw new Error(`add ${name} exited ${res.code}`);
		}
		return { ...res, fellBack: false };
	}
	const how = (res) =>
		res.timedOut
			? "waited for input (timed out)"
			: res.fellBack
				? `prompted and installed nothing (exit ${res.code}); redone with --overwrite`
				: res.prompted
					? `prompted, answered "n" on stdin (exit ${res.code})`
					: `no prompt (exit ${res.code})`;

	// S2: two separate adds sharing internals: no duplicate, no clobber.
	if (want("s2")) {
		step("S2 two separate adds sharing internals: dialog, then context-menu");
		const first = await addWithoutOverwrite("dialog");
		installed.add("dialog");
		const before = snapshotTree(join(app, stack.uiRoot));
		const second = await addWithoutOverwrite("context-menu");
		installed.add("context-menu");
		const problems = [];
		const after = snapshotTree(join(app, stack.uiRoot));
		for (const [f, h] of before)
			if (after.get(f) !== h) problems.push(`changed ${f.slice(app.length + 1)}`);
		problems.push(...r.placementProblems(app, ["dialog", "context-menu"]));
		const shared = r
			.closureOf(["dialog"])
			.filter((n) => n !== "dialog" && r.closureOf(["context-menu"]).includes(n));
		r.record(
			"S2",
			"two adds sharing internals: one copy, no clobber",
			problems.length ? "FAIL" : "PASS",
			problems.length
				? problems.slice(0, 6).join("; ")
				: `shared ${shared.join(", ")}: one copy each, byte-unchanged by the second add (${after.size - before.size} new files)`
		);
		const scriptable = !first.fellBack && !second.fellBack && !first.timedOut && !second.timedOut;
		r.record(
			"S2n",
			"second add without --overwrite runs unattended",
			scriptable ? "PASS" : "MANUAL",
			`dialog: ${how(first)}; context-menu: ${how(second)}`
		);
	}

	// S3: edit installed files, re-add without then with overwrite.
	if (want("s3")) {
		step("S3 edit installed files, re-add without then with --overwrite");
		if (!installed.has("dialog")) {
			await stack.add(app, [r.url("dialog")]);
			installed.add("dialog");
		}
		const pick = (name) => r.item(name).files.find((f) => /\.ts$/.test(r.landing(f)));
		const targets = [pick("internals"), pick("dialog")].map((f) => join(app, r.landing(f)));
		const pristine = targets.map((f) => readFileSync(f, "utf8"));
		targets.forEach((f, i) => writeFileSync(f, pristine[i] + markerFor(f)));
		const kept = await stack.add(app, [r.url("dialog")], { overwrite: false });
		const survived = targets.filter((f) =>
			readFileSync(f, "utf8").includes("consumer-edit-marker")
		);
		const rel = (f) => f.slice(app.length + 1);
		const mode = kept.timedOut
			? "waited for input (timed out)"
			: kept.prompted
				? `prompted; closed/"n" stdin (exit ${kept.code})`
				: `no prompt (exit ${kept.code})`;
		if (kept.timedOut) {
			r.record("S3a", "re-add without --overwrite keeps local edits", "MANUAL", mode);
		} else if (survived.length === targets.length) {
			r.record(
				"S3a",
				"re-add without --overwrite keeps local edits",
				"PASS",
				`${mode}; edits kept in ${targets.map(rel).join(", ")}`
			);
		} else {
			r.record(
				"S3a",
				"re-add without --overwrite keeps local edits",
				"FAIL",
				`${mode}; edits lost in ${targets
					.filter((f) => !survived.includes(f))
					.map(rel)
					.join(", ")}`
			);
		}
		await stack.add(app, [r.url("dialog")]);
		const restored = targets.every((f, i) => readFileSync(f, "utf8") === pristine[i]);
		r.record(
			"S3b",
			"re-add with --overwrite restores the registry version",
			restored ? "PASS" : "FAIL",
			restored ? "edits replaced by the item content" : "files differ from the pre-edit copy"
		);
	}

	// S4 (part 2): the consumer's utils untouched; a file already at a target path.
	if (want("s4")) {
		step("S4 pre-existing consumer files: own utils, a file at a target path");
		const problems = [];
		if (utilsBefore !== null && sha(readFileSync(utilsFile)) !== utilsBefore)
			problems.push(`${stack.utilsPath} was modified`);
		const badge = r.item("badge");
		const main = badge.files.find((f) => /index\.ts$/.test(r.landing(f))) ?? badge.files[0];
		const target = join(app, r.landing(main));
		const mine = `// consumer's own file\nexport const consumerBadge = true;\n`;
		mkdirSync(dirname(target), { recursive: true });
		writeFileSync(target, mine);
		const res = await stack.add(app, [r.url("badge")], { overwrite: false });
		const keptMine = existsSync(target) && readFileSync(target, "utf8") === mine;
		const status = res.timedOut ? "MANUAL" : keptMine && !problems.length ? "PASS" : "FAIL";
		r.record(
			"S4",
			"consumer files: own utils untouched, colliding file not overwritten without --overwrite",
			status,
			[
				...problems,
				utilsBefore !== null && !problems.length ? `${stack.utilsPath} untouched` : "",
				res.timedOut
					? "add waited for input at the collision"
					: `${r.landing(main)} ${keptMine ? "kept" : "overwritten"} (${res.prompted ? "prompted" : "no prompt"}, exit ${res.code})`,
			]
				.filter(Boolean)
				.join("; ")
		);
		// Leave a coherent tree for the build.
		await stack.add(app, [r.url("badge")]);
		installed.add("badge");
	}

	// S6: the copied code never depends on the npm package.
	if (want("s6")) {
		step("S6 no fancy-ui npm package in the copied code or the app");
		const files = walk(join(app, stack.uiRoot));
		const hits = selfImports(files, (f) => readFileSync(f, "utf8"));
		const pkg = JSON.parse(readFileSync(join(app, "package.json"), "utf8"));
		const declared = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).filter((d) =>
			OWN_PACKAGE.test(d)
		);
		const nm = existsSync(join(app, "node_modules"))
			? readdirSync(join(app, "node_modules")).filter((d) => OWN_PACKAGE.test(d))
			: [];
		const problems = [
			...hits,
			...declared.map((d) => `package.json declares ${d}`),
			...nm.map((d) => `node_modules/${d}`),
		];
		r.record(
			"S6",
			"no import of fancy-ui-svelte/-react/-vue/-cameleon",
			problems.length ? "FAIL" : "PASS",
			problems.length ? problems.join("; ") : `${files.length} installed files scanned`
		);
	}

	// App A: render the default page and type-check + build everything installed.
	if (appA) step("app A: render, type-check and build");
	if (appA)
		try {
			const shown = DEFAULT_ITEMS.filter((n) => installed.has(n));
			stack.render(app, shown);
			await stack.verify(app, [...installed].sort(), cleanup, { stack, pagesRoot });
			r.record(
				"BUILD",
				"app A type-check + build (+ render)",
				"PASS",
				`${installed.size} items: ${[...installed].sort().join(", ")}`
			);
		} catch (e) {
			r.record(
				"BUILD",
				"app A type-check + build (+ render)",
				"FAIL",
				e instanceof Error ? e.message : String(e)
			);
		}

	// S5: a non-default `ui` alias.
	if (want("s5")) {
		step("S5 non-default ui alias (app B)");
		const appB = join(work, "app-alias");
		try {
			await stack.scaffold(appB);
			const cfgPath = join(appB, "components.json");
			const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
			cfg.aliases = { ...cfg.aliases, ui: stack.altAlias.alias };
			writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
			await stack.add(appB, ["button", "rainbow-button"].map(r.url));
			stack.render(appB, ["button", "rainbow-button"]);
			const entry = join(appB, stack.entryFile);
			writeFileSync(
				entry,
				readFileSync(entry, "utf8").split(stack.importRoot).join(stack.altAlias.importRoot)
			);
			const problems = r.placementProblems(appB, ["button", "rainbow-button"], stack.altAlias.root);
			if (problems.length) {
				const probe = stack.landRel(r.item("button").files[0]);
				const found = appFiles(appB)
					.map((f) =>
						f
							.slice(appB.length + 1)
							.split(sep)
							.join("/")
					)
					.find((f) => f.endsWith(probe));
				if (found) problems.unshift(`landed at ${found} instead`);
				r.record(
					"S5",
					`ui alias ${stack.altAlias.alias}`,
					stack.altAlias.knownLimitation ? "LIMITATION" : "FAIL",
					problems.slice(0, 4).join("; ")
				);
			} else {
				await typecheckAndBuild(appB, stack);
				r.record(
					"S5",
					`ui alias ${stack.altAlias.alias}`,
					"PASS",
					`files under ${stack.altAlias.root}/fancy, imported from ${stack.altAlias.importRoot}; type-check + build pass`
				);
			}
		} catch (e) {
			r.record(
				"S5",
				`ui alias ${stack.altAlias.alias}`,
				"FAIL",
				e instanceof Error ? e.message : String(e)
			);
		}
	}

	return r.results;
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
		uiRoot: "src/lib/components/ui",
		landRel: (file) => file.target,
		utilsPath: "src/lib/utils.ts",
		utilsAlias: "$lib/utils",
		altAlias: {
			alias: "$lib/shared/ui",
			root: "src/lib/shared/ui",
			importRoot: "$lib/shared/ui/fancy/",
		},
		entryFile: "src/routes/+page.svelte",
		importRoot: "$lib/components/ui/fancy/",
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
		uiRoot: "src/components/ui",
		landRel: (file) => file.target.replace(/^@ui\//, ""),
		utilsPath: "src/lib/utils.ts",
		altAlias: { alias: "@/shared/ui", root: "src/shared/ui", importRoot: "@/shared/ui/fancy/" },
		entryFile: "src/main.tsx",
		importRoot: "@/components/ui/fancy/",
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
		uiRoot: "src/components/ui",
		landRel: (file) => file.path.replace(/^src\/components\/ui\//, ""),
		utilsPath: "src/lib/utils.ts",
		// Files are steered by their `path`, which names `components/ui`: a
		// different alias is expected not to be followed (contract G2/S5).
		altAlias: {
			alias: "@/shared/ui",
			root: "src/shared/ui",
			importRoot: "@/shared/ui/fancy/",
			knownLimitation: true,
		},
		entryFile: "src/App.vue",
		importRoot: "@/components/ui/fancy/",
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
	// --items / --all: the original single-add mode. Otherwise: the scenarios.
	const legacy = flag("all") || value("items") !== undefined;
	const items = flag("all")
		? index.items.map((i) => i.name)
		: (value("items")?.split(",").filter(Boolean) ?? DEFAULT_ITEMS);
	const scenarioItems = [
		"button",
		"rainbow-button",
		"confetti",
		"dialog",
		"context-menu",
		"badge",
		"internals",
	];
	const missing = (legacy ? items : scenarioItems).filter((n) => !known.has(n));
	if (items.length === 0) usage("no items.");
	if (missing.length > 0) {
		console.error(
			`check-registry-cli: not in the ${stackName} registry index: ${missing.join(", ")}`
		);
		process.exit(2);
	}
	const wanted = new Set((value("scenario") ?? "all").toLowerCase().split(",").filter(Boolean));
	for (const id of wanted)
		if (!["all", "s1", "s2", "s3", "s4", "s5", "s6"].includes(id)) usage(`unknown scenario ${id}.`);

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
	const cliName = { svelte: "shadcn-svelte", react: "shadcn", vue: "shadcn-vue" }[stackName];
	const versions = `${cliName}@${cliVersion(cliName)}${stackName === "svelte" ? `, sv@${CLI_VERSIONS.sv}` : ""}, node ${process.version}`;
	console.log(`check-registry-cli: ${stackName} with ${versions}`);

	const server = await serve(pagesRoot);
	const base = `http://127.0.0.1:${server.address().port}/${stack.registry}`;
	const cleanup = [() => server.close()];
	let failed = false;
	try {
		if (legacy) {
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
		} else {
			const results = await runScenarios({
				stack,
				stackName,
				pagesRoot,
				base,
				work,
				wanted,
				cleanup,
			});
			console.log(`\n== scenario results: ${stackName} (${versions})`);
			for (const res of results)
				console.log(
					`${res.id.padEnd(6)} ${res.status.padEnd(10)} ${res.title}${res.note ? ` — ${res.note}` : ""}`
				);
			const report = value("report");
			if (report)
				writeFileSync(
					resolve(report),
					JSON.stringify({ stack: stackName, versions, results }, null, 2)
				);
			failed = results.some((res) => res.status === "FAIL");
			console.log(`\ncheck-registry-cli: ${failed ? "FAIL" : "OK"} (${stackName}).`);
		}
	} catch (e) {
		failed = true;
		console.error(
			`\ncheck-registry-cli: FAIL (${stackName}): ${e instanceof Error ? e.message : String(e)}`
		);
	} finally {
		for (const fn of cleanup.reverse()) await fn();
		if (flag("keep") || failed) console.log(`scratch apps kept in ${work}`);
		// Only the folder this run created is removed, never a user-supplied parent.
		else rmSync(work, { recursive: true, force: true });
	}
	process.exit(failed ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
