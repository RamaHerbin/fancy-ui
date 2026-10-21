#!/usr/bin/env node
/**
 * Copy-source registry, end to end, the way a user runs it.
 *
 * MANUAL / PRE-RELEASE CHECK. It is not wired in CI: it needs the network
 * (package installs, the CLI itself), takes minutes, and depends on a prior
 * `pnpm build`. Run it before a release and after any change under
 * `src/lib/server/registry/`.
 *
 * What it does for one stack:
 *   1. serves the prerendered registry JSON (`pnpm build` output) from a tiny
 *      local static server, rewriting the production site URL to the local one
 *      so `registryDependencies` resolve locally;
 *   2. scaffolds a clean app in a scratch directory outside the repository;
 *   3. runs the documented CLI command non-interactively for three items;
 *   4. type-checks and builds the app, rendering the three components in a page.
 *
 * Usage:
 *   pnpm build
 *   node scripts/check-registry-cli.mjs react [--keep] [--dir <scratch>] [--items a,b,c]
 *
 * Stacks: react (implemented). svelte and vue are not automated yet.
 */

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PRERENDERED = join(ROOT, ".svelte-kit/output/prerendered/pages");
const SITE_URL = "https://fancy-ui.rama.app";

const args = process.argv.slice(2);
const stack = args.find((a) => !a.startsWith("--")) ?? "react";
const keep = args.includes("--keep");
const flag = (name) => {
	const i = args.indexOf(name);
	return i >= 0 ? args[i + 1] : undefined;
};
const items = (flag("--items") ?? "button,rainbow-button,dialog").split(",");

const fail = (msg) => {
	console.error(`\ncheck-registry-cli: FAIL: ${msg}`);
	process.exitCode = 1;
};

if (stack !== "react") {
	console.error(`check-registry-cli: stack "${stack}" is not automated yet (react only).`);
	process.exit(2);
}
if (!existsSync(join(PRERENDERED, "r/registry.json"))) {
	console.error("check-registry-cli: no prerendered registry. Run `pnpm build` first.");
	process.exit(2);
}

/** Static server over the prerendered pages, with the site URL rewritten. */
function serve() {
	return new Promise((res) => {
		const server = createServer((req, resp) => {
			const url = new URL(req.url ?? "/", "http://localhost");
			const file = join(PRERENDERED, decodeURIComponent(url.pathname));
			if (!file.startsWith(PRERENDERED) || !file.endsWith(".json") || !existsSync(file)) {
				resp.writeHead(404).end("not found");
				return;
			}
			const origin = `http://127.0.0.1:${server.address().port}`;
			const body = readFileSync(file, "utf8").split(SITE_URL).join(origin);
			resp.writeHead(200, { "Content-Type": "application/json; charset=utf-8" }).end(body);
		});
		server.listen(0, "127.0.0.1", () => res(server));
	});
}

/** Async on purpose: the registry server lives in this process and must keep answering. */
const run = (cmd, argv, cwd) =>
	new Promise((res, rej) => {
		console.log(`\n$ ${cmd} ${argv.join(" ")}`);
		const child = spawn(cmd, argv, {
			cwd,
			stdio: ["ignore", "inherit", "inherit"],
			env: { ...process.env, CI: "1" },
		});
		child.on("exit", (code) =>
			code === 0 ? res() : rej(new Error(`${cmd} ${argv.join(" ")} exited with ${code}`))
		);
	});

const write = (dir, rel, text) => {
	const file = join(dir, rel);
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, text);
};

function scaffoldReact(dir) {
	write(
		dir,
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
		dir,
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
		dir,
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
		dir,
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
	write(dir, "src/index.css", '@import "tailwindcss";\n');
	write(
		dir,
		"index.html",
		'<div id="root"></div><script type="module" src="/src/main.tsx"></script>\n'
	);
}

function renderReact(dir, names) {
	const pascal = (s) => s.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase());
	write(
		dir,
		"src/main.tsx",
		`import { createRoot } from "react-dom/client";
import "./index.css";
import { Button } from "@/components/ui/fancy/components/button";
import { RainbowButton } from "@/components/ui/fancy/components/rainbow-button";
import { Dialog } from "@/components/ui/fancy/components/dialog";

createRoot(document.getElementById("root")!).render(
	<main>
		<Button>Plain</Button>
		<RainbowButton>Rainbow</RainbowButton>
		<Dialog open={false} onOpenChange={() => {}} title="Hello">
			Body
		</Dialog>
	</main>
);
`
	);
	return names.map(pascal);
}

const server = await serve();
const origin = `http://127.0.0.1:${server.address().port}`;
const dir = flag("--dir") ?? mkdtempSync(join(tmpdir(), "registry-cli-"));
mkdirSync(dir, { recursive: true });
console.log(`registry: ${origin}/r   app: ${dir}`);

try {
	scaffoldReact(dir);
	await run("npm", ["install", "--no-audit", "--no-fund"], dir);
	for (const name of items) {
		await run(
			"npx",
			["--yes", "shadcn@latest", "add", `${origin}/r/${name}.json`, "--yes", "--overwrite"],
			dir
		);
	}
	renderReact(dir, items);
	await run("npm", ["install", "--no-audit", "--no-fund"], dir);
	await run("npm", ["run", "build"], dir);
	console.log("\ncheck-registry-cli: OK");
} catch (e) {
	fail(e instanceof Error ? e.message : String(e));
} finally {
	server.close();
	if (!keep && process.exitCode !== 1 && !flag("--dir"))
		rmSync(dir, { recursive: true, force: true });
	else console.log(`app kept at ${dir}`);
}
