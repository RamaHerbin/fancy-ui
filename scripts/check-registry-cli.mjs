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
 *   node scripts/check-registry-cli.mjs --stack svelte|react [--items a,b,c | --all]
 *                                       [--workdir <dir>] [--registry-dir <dir>] [--keep]
 *
 *   --stack         which registry and CLI to exercise (required; a bare first
 *                   positional argument is accepted too)
 *   --items         comma-separated item names (default: button,rainbow-button,dialog)
 *   --all           every item of the stack's index (stress test, slower)
 *   --workdir       scratch directory (default: a fresh one under the system temp
 *                   dir); only the `app/` this run creates inside it is removed
 *   --registry-dir  prerendered pages root that contains `r/` (default:
 *                   .svelte-kit/output/prerendered/pages)
 *   --keep          keep the scratch app for inspection (its path is printed)
 *
 * Exit code 0 only when every step passed; 2 on a usage error. The vue stack
 * is not automated yet.
 */

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	realpathSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_ITEMS = ["button", "rainbow-button", "dialog"];

/** Single source of truth: SITE_URL in src/lib/site.ts (read, not copied, so the rewrite never goes stale). */
const SITE_URL = /SITE_URL\s*=\s*["']([^"']+)["']/.exec(
	readFileSync(join(ROOT, "src/lib/site.ts"), "utf8")
)?.[1];
if (!SITE_URL) {
	console.error("check-registry-cli: could not read SITE_URL from src/lib/site.ts.");
	process.exit(2);
}

// --- arguments ----------------------------------------------------------------

const args = process.argv.slice(2);
const VALUE_FLAGS = new Set(["--stack", "--items", "--workdir", "--registry-dir"]);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => {
	const i = args.indexOf(`--${name}`);
	return i >= 0 ? args[i + 1] : undefined;
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

async function verifySvelte(app, items, cleanup) {
	step("svelte-check");
	console.log((await run("pnpm", ["check"], app)).split("\n").slice(-3).join("\n"));

	step("vite build");
	await run("pnpm", ["build"], app);

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

async function verifyReact(app) {
	step("install the dependencies the items declared");
	await run("npm", ["install", "--no-audit", "--no-fund"], app);
	step("tsc + vite build");
	await run("npm", ["run", "build"], app);
}

// --- the per-stack table ----------------------------------------------------------

const STACKS = {
	svelte: {
		registry: "r/svelte",
		label: "SvelteKit",
		cli: "shadcn-svelte add",
		scaffold: scaffoldSvelte,
		add: addSvelte,
		render: renderSvelte,
		verify: verifySvelte,
	},
	react: {
		registry: "r",
		label: "React + Vite",
		cli: "shadcn add",
		scaffold: scaffoldReact,
		add: addReact,
		render: renderReact,
		verify: verifyReact,
	},
};

// --- main -------------------------------------------------------------------------

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

const userWork = Boolean(value("workdir"));
const work = realpathSync(
	userWork
		? (mkdirSync(value("workdir"), { recursive: true }), resolve(value("workdir")))
		: mkdtempSync(join(tmpdir(), "fancy-registry-cli-"))
);
const realRoot = realpathSync(ROOT);
if (work === realRoot || work.startsWith(realRoot + sep)) {
	console.error("check-registry-cli: the scratch app must live outside the repository.");
	process.exit(2);
}
const app = join(work, "app");
if (existsSync(app)) {
	console.error(`check-registry-cli: ${app} already exists; pick another --workdir or remove it.`);
	process.exit(2);
}

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

	await stack.verify(app, items, cleanup);
	console.log(
		`\ncheck-registry-cli: OK (${stackName}): ${items.length} item(s) installed, checked and built.`
	);
} catch (e) {
	failed = true;
	console.error(
		`\ncheck-registry-cli: FAIL (${stackName}): ${e instanceof Error ? e.message : String(e)}`
	);
} finally {
	for (const fn of cleanup.reverse()) fn();
	if (flag("keep") || failed) console.log(`scratch app kept at ${app}`);
	// A directory the user passed in is theirs: only remove what this run created.
	else rmSync(userWork ? app : work, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
