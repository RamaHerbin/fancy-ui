#!/usr/bin/env node
/**
 * Copy-source registry, end to end, the way a user does it.
 *
 * MANUAL / PRE-RELEASE CHECK. It is not wired in CI: it needs the network
 * (npm registry, scaffolder, CLI), takes a few minutes, and the CLI it drives
 * is published independently of this repo. Run it before a release that
 * touches `src/lib/server/registry/`, and whenever the CLI changes behaviour.
 *
 * What it does (Svelte stack):
 *   1. reads the prerendered registry JSON (`pnpm build` first), or `--dir`;
 *   2. serves it on a free local port (the public origin inside each item is
 *      rewritten to the local one, so `registryDependencies` resolve locally);
 *   3. scaffolds a clean SvelteKit app OUTSIDE the repository (system temp
 *      dir), with Tailwind and the CLI's `components.json` + class-name helper;
 *   4. runs the documented `shadcn-svelte add <url>` for the chosen items,
 *      non-interactively;
 *   5. renders them in a page, then runs `svelte-check`, `vite build` and a
 *      server-side render through `vite preview`.
 *
 * Usage:
 *   node scripts/check-registry-cli.mjs svelte [--items a,b,c | --all]
 *                                       [--dir <path>] [--keep] [--work <path>]
 *
 *   --items   comma-separated item names (default: button,rainbow-button,dialog)
 *   --all     every item of the index (stress test, slower)
 *   --dir     registry JSON directory (default:
 *             .svelte-kit/output/prerendered/pages/r/svelte)
 *   --keep    keep the scratch app for inspection (its path is printed)
 *   --work    scratch directory (default: a fresh one under the system temp dir)
 *
 * Exit code 0 only when every step passed. Only the Svelte stack is covered.
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
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_ORIGIN = "https://fancy-ui.rama.app";
const DEFAULT_ITEMS = ["button", "rainbow-button", "dialog"];

const args = process.argv.slice(2);
const stack = args.find((a) => !a.startsWith("--"));
const flag = (name) => args.includes(`--${name}`);
const value = (name) => {
	const i = args.indexOf(`--${name}`);
	return i >= 0 ? args[i + 1] : undefined;
};

if (stack !== "svelte") {
	console.error(
		"Usage: node scripts/check-registry-cli.mjs svelte [--items a,b | --all] [--dir <path>] [--keep]\nOnly the svelte stack is covered."
	);
	process.exit(2);
}

const registryDir = resolve(
	value("dir") ?? join(repoRoot, ".svelte-kit", "output", "prerendered", "pages", "r", "svelte")
);
if (!existsSync(join(registryDir, "registry.json"))) {
	console.error(`No registry JSON in ${registryDir}. Run "pnpm build" first, or pass --dir.`);
	process.exit(2);
}
const index = JSON.parse(readFileSync(join(registryDir, "registry.json"), "utf8"));
const known = new Set(index.items.map((i) => i.name));
const items = flag("all")
	? index.items.map((i) => i.name)
	: (value("items")?.split(",").filter(Boolean) ?? DEFAULT_ITEMS);
const missing = items.filter((n) => !known.has(n));
if (missing.length > 0) {
	console.error(`Not in the registry index: ${missing.join(", ")}`);
	process.exit(2);
}

const work = realpathSync(
	value("work")
		? (mkdirSync(value("work"), { recursive: true }), resolve(value("work")))
		: mkdtempSync(join(tmpdir(), "fancy-registry-cli-"))
);
if (work.startsWith(repoRoot)) {
	console.error("The scratch app must live outside the repository.");
	process.exit(2);
}
const app = join(work, "app");

function step(title) {
	console.log(`\n== ${title}`);
}

/** Async on purpose: the registry server lives in this process and must keep answering. */
function run(cmd, cmdArgs, cwd = work, extraEnv = {}) {
	return new Promise((ok, fail) => {
		const child = spawn(cmd, cmdArgs, { cwd, env: { ...process.env, CI: "1", ...extraEnv } });
		let out = "";
		child.stdout.on("data", (d) => (out += d));
		child.stderr.on("data", (d) => (out += d));
		child.on("close", (code) => {
			if (code === 0) return ok(out);
			console.error(`${cmd} ${cmdArgs.join(" ")}\n${out}`);
			fail(new Error(`step failed: ${cmd} ${cmdArgs.slice(0, 3).join(" ")}`));
		});
	});
}

/** Item JSON from disk, with the public origin swapped for the local one. */
function serve() {
	return new Promise((ok) => {
		const server = createServer((req, res) => {
			const rel = decodeURIComponent((req.url ?? "").split("?")[0]).replace(/^\/r\/svelte\//, "");
			const file = join(registryDir, rel);
			if (rel.includes("..") || !existsSync(file)) {
				res.writeHead(404);
				return res.end("not found");
			}
			const origin = `http://localhost:${server.address().port}`;
			res.writeHead(200, { "content-type": "application/json" });
			res.end(readFileSync(file, "utf8").replaceAll(PUBLIC_ORIGIN, origin));
		});
		server.listen(0, "127.0.0.1", () => ok(server));
	});
}

const PAGE = {
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

async function main() {
	const server = await serve();
	const base = `http://localhost:${server.address().port}/r/svelte`;
	let preview;
	try {
		step(`scaffold a clean SvelteKit app in ${app}`);
		await run("npx", [
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
		]);
		await run(
			"npx",
			["--yes", "sv@latest", "add", "tailwindcss=plugins:none", "--no-install"],
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
		writeFileSync(
			vitePath,
			readFileSync(vitePath, "utf8").replace(
				"sveltekit({",
				"sveltekit({\n\t\t\talias: { $lib: 'src/lib' },"
			)
		);
		writeFileSync(
			join(app, "components.json"),
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
		writeFileSync(
			join(app, "src", "lib", "utils.ts"),
			`import { clsx, type ClassValue } from "clsx";\nimport { twMerge } from "tailwind-merge";\n\nexport function cn(...inputs: ClassValue[]) {\n\treturn twMerge(clsx(inputs));\n}\n`
		);
		await run("pnpm", ["install"], app);
		await run("pnpm", ["add", "clsx", "tailwind-merge"], app);

		step(`shadcn-svelte add (${items.length} item${items.length === 1 ? "" : "s"}) from ${base}`);
		const out = await run(
			"npx",
			[
				"--yes",
				"shadcn-svelte@latest",
				"add",
				...items.map((n) => `${base}/${n}.json`),
				"--yes",
				"--overwrite",
			],
			app
		);
		console.log(
			out
				.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "")
				.split("\n")
				.filter((l) => /installed|Success/.test(l))
				.join("\n")
		);

		step("render the components in a page");
		const shown = items.filter((n) => PAGE[n]);
		writeFileSync(
			join(app, "src", "routes", "+page.svelte"),
			`<script lang="ts">\n\t${shown.map((n) => PAGE[n].imp).join("\n\t")}\n\tlet open = $state(false);\n</script>\n\n<main>\n\t${shown.map((n) => PAGE[n].markup).join("\n\t")}\n</main>\n`
		);

		step("svelte-check");
		console.log((await run("pnpm", ["check"], app)).split("\n").slice(-3).join("\n"));

		step("vite build");
		await run("pnpm", ["build"], app);

		step("server-side render through vite preview");
		const port = 4700 + Math.floor(Math.random() * 200);
		preview = spawn("pnpm", ["exec", "vite", "preview", "--port", String(port), "--strictPort"], {
			cwd: app,
			stdio: "ignore",
		});
		let html = "";
		for (let i = 0; i < 40 && !html; i++) {
			await new Promise((r) => setTimeout(r, 500));
			try {
				const res = await fetch(`http://localhost:${port}/`);
				if (res.ok) html = await res.text();
			} catch {}
		}
		if (!html) throw new Error("preview server never answered");
		for (const n of shown) {
			const needle = PAGE[n].expect;
			if (needle && !html.includes(needle))
				throw new Error(`"${needle}" (${n}) missing from the rendered page`);
		}
		console.log("rendered page contains the components");
		console.log(`\nOK: ${items.length} item(s) installed, checked, built and rendered.`);
	} finally {
		preview?.kill();
		server.close();
	}
}

let failed = false;
try {
	await main();
} catch (e) {
	failed = true;
	console.error(`\nFAILED: ${e.message}`);
} finally {
	if (flag("keep") || failed) console.log(`scratch app kept at ${app}`);
	else rmSync(work, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
