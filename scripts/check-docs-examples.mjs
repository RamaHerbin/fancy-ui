#!/usr/bin/env node
/**
 * Verifies the React and Vue docs examples the way a consumer would meet them:
 * against the BUILT packages (react/dist, vue/dist), not the sources.
 *
 *   1. Types. Generates an `All.tsx` / `All.vue` that imports every file under
 *      `<pkg>/docs-examples/`, then runs `tsc --noEmit` / `vue-tsc --noEmit`
 *      (strict templates for Vue) with the package name mapped to dist. A wrong
 *      prop, event, v-model or slot name fails here.
 *   2. Mount. Loads every example through a throwaway Vite server into jsdom,
 *      mounts it, clicks its first button, and fails on any console error,
 *      framework warning or uncaught exception.
 *
 * A failure means the example is wrong, or the port is. Fix the example first;
 * if the example matches the Svelte behaviour and the port still refuses it,
 * file a ticket against the port instead of bending the snippet.
 *
 *   node scripts/check-docs-examples.mjs [--only react|vue] [--build] [--types-only] [--mount-only]
 *
 * dist is built once when missing; `--build` forces a rebuild. Scratch files
 * live under `<pkg>/node_modules/.cache/docs-examples/` and are never shipped.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => {
	const at = args.indexOf(`--${name}`);
	return at === -1 ? undefined : args[at + 1];
};

const FRAMEWORKS = {
	react: { dir: join(repoRoot, "react"), pkg: "fancy-ui-react", ext: ".tsx", tsc: "tsc" },
	vue: { dir: join(repoRoot, "vue"), pkg: "fancy-ui-vue", ext: ".vue", tsc: "vue-tsc" },
};

const slugsOf = (fw) =>
	readdirSync(join(fw.dir, "docs-examples"), { withFileTypes: true })
		.filter((entry) => entry.isFile() && entry.name.endsWith(fw.ext))
		.map((entry) => entry.name.slice(0, -fw.ext.length))
		.sort();

const scratchOf = (fw) => join(fw.dir, "node_modules", ".cache", "docs-examples");

/** `icon-button` -> `IconButtonExample`, as the React files name their export. */
const exportNameOf = (fw, slug) => {
	const source = readFileSync(join(fw.dir, "docs-examples", slug + fw.ext), "utf8");
	const match = source.match(/export function (\w+)/);
	if (!match) throw new Error(`docs-examples/${slug}${fw.ext} has no \`export function\``);
	return match[1];
};

// ---------------------------------------------------------------- mount mode

async function mountAll(fw) {
	const requireFromPackage = createRequire(join(fw.dir, "package.json"));
	const { JSDOM } = requireFromPackage("jsdom");
	const dom = new JSDOM("<!doctype html><html><body></body></html>", {
		pretendToBeVisual: true,
		url: "http://localhost/",
	});
	installBrowserGlobals(dom.window);

	const errors = [];
	const originalError = console.error;
	// jsdom has no GPU: a GPU effect reporting that it cannot get a context is the
	// environment talking, not the example.
	const GPU_UNAVAILABLE = /WebGL|WebGPU/i;
	console.error = (...parts) => {
		const line = parts.map(String).join(" ");
		if (!GPU_UNAVAILABLE.test(line)) errors.push(line);
	};
	process.on("uncaughtException", (error) => errors.push(`uncaught: ${error?.stack ?? error}`));
	process.on("unhandledRejection", (error) => errors.push(`unhandled rejection: ${error}`));

	const { createServer } = requireFromPackage("vite");
	const plugins = [];
	if (fw === FRAMEWORKS.vue) {
		const vue = requireFromPackage("@vitejs/plugin-vue").default;
		// ssrLoadModule hands the SFC plugin `ssr: true`, which compiles templates to
		// string-pushing render functions. The point here is a client mount in jsdom,
		// so every hook is told it is not a server build.
		const plugin = vue();
		for (const hook of ["load", "transform", "resolveId"]) {
			const original = plugin[hook];
			if (!original) continue;
			const call = typeof original === "function" ? original : original.handler;
			const wrapped = function (first, second, options) {
				return call.call(this, first, second, { ...options, ssr: false });
			};
			plugin[hook] = typeof original === "function" ? wrapped : { ...original, handler: wrapped };
		}
		plugins.push(plugin);
	}
	const server = await createServer({
		root: fw.dir,
		configFile: false,
		logLevel: "error",
		appType: "custom",
		server: { middlewareMode: true, hmr: false, ws: false },
		optimizeDeps: { noDiscovery: true, include: [] },
		resolve: { alias: { [fw.pkg]: join(fw.dir, "dist", "index.js") } },
		esbuild: { jsx: "automatic" },
		plugins,
	});

	const failures = [];
	try {
		for (const slug of slugsOf(fw)) {
			errors.length = 0;
			const container = dom.window.document.createElement("div");
			dom.window.document.body.appendChild(container);
			try {
				const mod = await server.ssrLoadModule(join(fw.dir, "docs-examples", slug + fw.ext));
				const unmount =
					fw === FRAMEWORKS.react
						? await mountReact(requireFromPackage, mod[exportNameOf(fw, slug)], container, errors)
						: await mountVue(requireFromPackage, mod.default, container, errors);

				if (container.innerHTML.trim() === "") errors.push("rendered nothing");
				const button = container.querySelector("button");
				if (button) {
					button.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
					await settle();
				}
				if (dom.window.document.body.innerHTML.trim() === "") errors.push("body emptied");
				unmount();
			} catch (error) {
				errors.push(`threw: ${error?.stack ?? error}`);
			}
			container.remove();
			if (errors.length > 0) failures.push({ slug, errors: [...errors] });
			else console.log(`  mounted ${fw.pkg} ${slug}`);
		}
	} finally {
		await server.close();
		console.error = originalError;
	}

	if (failures.length > 0) {
		for (const { slug, errors: list } of failures) {
			console.error(`\n${fw.pkg} docs-examples/${slug}${fw.ext} failed to mount:`);
			for (const line of list) console.error("  - " + line.split("\n").slice(0, 6).join("\n    "));
		}
		console.error(`\n${failures.length} ${fw.pkg} example(s) failed to mount`);
		process.exit(1);
	}
}

const settle = () => new Promise((done) => setTimeout(done, 40));

async function mountReact(requireFromPackage, Example, container, errors) {
	const React = await import(pathToFileURL(requireFromPackage.resolve("react")).href);
	const { createRoot } = await import(
		pathToFileURL(requireFromPackage.resolve("react-dom/client")).href
	);
	const { flushSync } = await import(pathToFileURL(requireFromPackage.resolve("react-dom")).href);
	if (typeof Example !== "function") throw new Error("example export is not a component");
	const root = createRoot(container, { onUncaughtError: (e) => errors.push(`uncaught: ${e}`) });
	flushSync(() => root.render(React.createElement(Example)));
	await settle();
	return () => flushSync(() => root.unmount());
}

async function mountVue(requireFromPackage, Example, container, errors) {
	const { createApp } = await import(pathToFileURL(requireFromPackage.resolve("vue")).href);
	const app = createApp(Example);
	app.config.errorHandler = (error) => errors.push(`vue error: ${error?.stack ?? error}`);
	app.config.warnHandler = (message) => errors.push(`vue warn: ${message}`);
	app.mount(container);
	await settle();
	return () => app.unmount();
}

/** The browser APIs jsdom lacks and the library's surfaces touch while mounting. */
function installBrowserGlobals(window) {
	for (const key of Object.getOwnPropertyNames(window)) {
		if (key in globalThis) continue;
		Object.defineProperty(globalThis, key, {
			configurable: true,
			get: () => window[key],
			set: (value) => Object.defineProperty(globalThis, key, { value, writable: true }),
		});
	}
	Object.defineProperty(globalThis, "window", { value: window, configurable: true });
	Object.defineProperty(globalThis, "document", { value: window.document, configurable: true });
	Object.defineProperty(globalThis, "navigator", { value: window.navigator, configurable: true });
	globalThis.IS_REACT_ACT_ENVIRONMENT = false;

	window.matchMedia ??= (query) => ({
		matches: false,
		media: query,
		onchange: null,
		addEventListener() {},
		removeEventListener() {},
		addListener() {},
		removeListener() {},
		dispatchEvent: () => false,
	});
	class Observer {
		observe() {}
		unobserve() {}
		disconnect() {}
		takeRecords() {
			return [];
		}
	}
	for (const name of ["ResizeObserver", "IntersectionObserver"]) {
		window[name] ??= Observer;
		globalThis[name] ??= Observer;
	}
	window.Element.prototype.animate ??= function animate() {
		const animation = {
			playState: "finished",
			currentTime: 0,
			effect: null,
			onfinish: null,
			oncancel: null,
			cancelled: false,
			cancel() {
				this.cancelled = true;
			},
			finish() {},
			pause() {},
			play() {},
			reverse() {},
			commitStyles() {},
			addEventListener() {},
			removeEventListener() {},
			finished: Promise.resolve(),
		};
		queueMicrotask(() => {
			if (!animation.cancelled) animation.onfinish?.();
		});
		return animation;
	};
	window.Element.prototype.scrollIntoView ??= () => {};
	window.HTMLElement.prototype.scrollTo ??= () => {};
	window.HTMLElement.prototype.showPopover ??= () => {};
	window.HTMLElement.prototype.hidePopover ??= () => {};
	window.scrollTo = () => {};
	window.HTMLCanvasElement.prototype.getContext = () => null;
	Object.defineProperty(window.navigator, "clipboard", {
		value: { writeText: async () => {} },
		configurable: true,
	});
}

// ------------------------------------------------------------------ type mode

function run(command, commandArgs, cwd) {
	const result = spawnSync(command, commandArgs, { cwd, encoding: "utf8", stdio: "pipe" });
	return { status: result.status, output: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

function ensureDist(name, fw) {
	if (flag("build") || !existsSync(join(fw.dir, "dist", "index.js"))) {
		console.log(`building ${fw.pkg} (dist missing or --build)`);
		const build = run("pnpm", ["--dir", fw.dir, "build"], repoRoot);
		if (build.status !== 0) {
			console.error(build.output);
			console.error(`${fw.pkg} build failed`);
			process.exit(1);
		}
	}
}

function writeScratch(fw) {
	const scratch = scratchOf(fw);
	mkdirSync(scratch, { recursive: true });
	const slugs = slugsOf(fw);
	const relExample = (slug) => `../../../docs-examples/${slug}${fw.ext}`;

	if (fw === FRAMEWORKS.react) {
		const lines = [
			"// Generated by scripts/check-docs-examples.mjs. Do not edit.",
			...slugs.map(
				(slug) =>
					`import { ${exportNameOf(fw, slug)} } from "${relExample(slug).replace(/\.tsx$/, "")}";`
			),
			"",
			"export const examples = [",
			...slugs.map((slug) => `\t<${exportNameOf(fw, slug)} key="${slug}" />,`),
			"];",
			"",
		];
		writeFileSync(join(scratch, "All.tsx"), lines.join("\n"));
	} else {
		const names = slugs.map(
			(slug) => slug.replace(/(^|-)(\w)/g, (_m, _d, c) => c.toUpperCase()) + "Example"
		);
		const lines = [
			"<!-- Generated by scripts/check-docs-examples.mjs. Do not edit. -->",
			'<script setup lang="ts">',
			...slugs.map((slug, i) => `import ${names[i]} from "${relExample(slug)}";`),
			"</script>",
			"",
			"<template>",
			...names.map((name) => `\t<${name} />`),
			"</template>",
			"",
		];
		writeFileSync(join(scratch, "All.vue"), lines.join("\n"));
	}

	const tsconfig = {
		compilerOptions: {
			target: "ES2022",
			lib: ["ES2022", "DOM", "DOM.Iterable"],
			module: "ESNext",
			moduleResolution: "bundler",
			jsx: "react-jsx",
			strict: true,
			noUncheckedIndexedAccess: true,
			verbatimModuleSyntax: true,
			isolatedModules: true,
			skipLibCheck: true,
			noEmit: true,
			types: [],
			baseUrl: "../../..",
			paths: { [fw.pkg]: ["./dist/index.d.ts"] },
		},
		...(fw === FRAMEWORKS.vue ? { vueCompilerOptions: { strictTemplates: true } } : {}),
		include: [
			fw === FRAMEWORKS.react ? "./All.tsx" : "./All.vue",
			`../../../docs-examples/**/*${fw.ext}`,
		],
		exclude: [],
	};
	writeFileSync(join(scratch, "tsconfig.json"), JSON.stringify(tsconfig, null, "\t"));
	return join(scratch, "tsconfig.json");
}

function typeCheck(fw) {
	const tsconfig = writeScratch(fw);
	const { status, output } = run("pnpm", ["exec", fw.tsc, "--noEmit", "-p", tsconfig], fw.dir);
	const lines = output.split("\n").filter((line) => /error TS\d+/.test(line));
	// Only diagnostics in the examples (or the generated barrel) count: dist
	// declarations are shipped output, checked by the package's own build.
	const own = lines.filter((line) => /docs-examples\/|All\.(tsx|vue)/.test(line));
	if (own.length > 0) {
		console.error(own.join("\n"));
		console.error(`\n${own.length} type error(s) in ${fw.pkg} docs-examples against dist`);
		process.exit(1);
	}
	if (status !== 0 && lines.length === 0) {
		console.error(output || `${fw.tsc} failed without diagnostics`);
		process.exit(1);
	}
	console.log(`${fw.pkg}: ${slugsOf(fw).length} example(s) type-check against dist`);
}

// ----------------------------------------------------------------------- main

if (option("mount")) {
	await mountAll(FRAMEWORKS[option("mount")]);
	process.exit(0);
}

const only = option("only");
const targets = Object.entries(FRAMEWORKS).filter(([name]) => !only || name === only);
if (targets.length === 0) {
	console.error("--only takes react or vue");
	process.exit(2);
}

for (const [name, fw] of targets) {
	ensureDist(name, fw);
	if (!flag("mount-only")) typeCheck(fw);
	if (!flag("types-only")) {
		const mount = spawnSync(process.execPath, [fileURLToPath(import.meta.url), "--mount", name], {
			cwd: repoRoot,
			stdio: "inherit",
		});
		if (mount.status !== 0) process.exit(mount.status ?? 1);
	}
}
console.log("docs-examples: every example type-checks against dist and mounts");
