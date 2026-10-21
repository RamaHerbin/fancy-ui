#!/usr/bin/env node
// Proves the React docs examples work for someone who installed the package.
//
// Every react/docs-examples/*.tsx is copied, as is, into a scratch copy of the
// examples/consumers/react-vite app (outside the repo, fancy-ui-react installed
// from the packed tarball). The copy is then
//
//   1. type-checked against the installed package's .d.ts files: the app's
//      `npm run build` is `tsc --noEmit` with strict on and skipLibCheck off,
//      so a snippet that does not compile (or a declaration that does not)
//      fails here;
//   2. mounted, one example per page (`/?example=<name>`), by a generated
//      entry that wraps each in an error boundary, and driven by the Playwright
//      specs in examples/consumers/react-vite/docs-examples-tests/: each
//      example must reach data-example-status="mounted" with no console error
//      or uncaught exception, plus a few interaction checks (dialog, button,
//      input) for the examples that have them.
//
// An example file is `<name>.tsx` and must export one function component
// (`export function FooExample()`); <name> is the file name without extension.
//
// CLI
//   node scripts/consumers/docs-examples-react.mjs [options]
//
//   --examples <dir>    folder of *.tsx examples (default: react/docs-examples).
//                       Only the top level is read; reusable for any folder of
//                       snippets that import "fancy-ui-react".
//   --with-install      also read <dir>/_install/*.tsx (names prefixed "install-")
//   --only a,b          only these example names
//   --tarball <file>    use this fancy-ui-react tarball instead of building one
//                       (default: $CONSUMER_PACKS_DIR/fancy-ui-react.tgz when
//                       set, else `pnpm --filter fancy-ui-react run build` then
//                       `pnpm pack`)
//   --no-run            copy, install and type-check/build only, skip Playwright
//   --keep              keep the scratch folder (its path is printed)
//   -h, --help          this text
//
// Exit code 0 only when the build and every Playwright test passed. Needs the
// same prerequisites as `pnpm consumers` (README in examples/consumers):
// Playwright's Chromium, network access for `npm install`, rsync.
import { spawnSync } from "node:child_process";
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	realpathSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import net from "node:net";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const PKG = "fancy-ui-react";

function parseArgs(argv) {
	const opts = {
		examples: join(root, "react/docs-examples"),
		withInstall: false,
		only: null,
		tarball: null,
		run: true,
		keep: false,
	};
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		const value = () => {
			const v = argv[++i];
			if (!v) fail(`${a} needs a value`);
			return v;
		};
		if (a === "--examples") opts.examples = resolve(value());
		else if (a === "--with-install") opts.withInstall = true;
		else if (a === "--only") opts.only = value().split(",").filter(Boolean);
		else if (a === "--tarball") opts.tarball = resolve(value());
		else if (a === "--no-run") opts.run = false;
		else if (a === "--keep") opts.keep = true;
		else if (a === "-h" || a === "--help") {
			const header = readFileSync(fileURLToPath(import.meta.url), "utf8")
				.split("\n")
				.filter((l) => l.startsWith("//"))
				.map((l) => l.replace(/^\/\/ ?/, ""));
			console.log(header.join("\n"));
			process.exit(0);
		} else fail(`unknown option ${a} (see --help)`);
	}
	return opts;
}

class Failure extends Error {}

// Throws so that main()'s finally block can clean the scratch folder up;
// the entry point turns it into a non-zero exit code afterwards.
function fail(message) {
	throw new Failure(message);
}

function sh(cmd, args, options = {}) {
	const r = spawnSync(cmd, args, { stdio: "inherit", ...options });
	if (r.status !== 0) fail(`${cmd} ${args.join(" ")} failed (exit ${r.status ?? r.signal})`);
}

/** The examples to mount: [{ name, file, exportName }]. */
export function collectExamples(dir, { withInstall = false, only = null } = {}) {
	if (!existsSync(dir)) fail(`no examples folder at ${dir}`);
	const found = [];
	const read = (folder, prefix) => {
		for (const file of readdirSync(folder).sort()) {
			if (!file.endsWith(".tsx")) continue;
			const source = readFileSync(join(folder, file), "utf8");
			const match = source.match(/export\s+function\s+([A-Z]\w*)\s*\(/);
			if (!match) fail(`${join(folder, file)} exports no function component`);
			found.push({
				name: prefix + basename(file, ".tsx"),
				path: join(folder, file),
				// Flat in the app; the prefix keeps _install/ names from colliding.
				file: prefix + file,
				exportName: match[1],
			});
		}
	};
	read(dir, "");
	if (withInstall && existsSync(join(dir, "_install"))) read(join(dir, "_install"), "install-");
	const picked = only ? found.filter((e) => only.includes(e.name)) : found;
	if (only) {
		const missing = only.filter((n) => !found.some((e) => e.name === n));
		if (missing.length) fail(`unknown example(s): ${missing.join(", ")}`);
	}
	if (!picked.length) fail(`no *.tsx examples in ${dir}`);
	return picked;
}

/** The entry that replaces src/main.tsx in the scratch app. */
export function harnessSource(examples) {
	const imports = examples
		.map(
			(e, i) =>
				`import { ${e.exportName} as Example${i} } from "./docs-examples/${e.file.replace(/\.tsx$/, "")}";`
		)
		.join("\n");
	const table = examples.map((e, i) => `\t${JSON.stringify(e.name)}: Example${i},`).join("\n");
	return `import { Component, StrictMode, useEffect, useRef, type ComponentType, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "fancy-ui-react/styles.css";
import "./app.css";
${imports}

const examples: Record<string, ComponentType> = {
${table}
};

class Boundary extends Component<{ children: ReactNode }, { error: string | null }> {
	state = { error: null as string | null };
	static getDerivedStateFromError(error: unknown) {
		return { error: String(error) };
	}
	render() {
		return this.state.error === null ? (
			this.props.children
		) : (
			<pre data-example-error>{this.state.error}</pre>
		);
	}
}

function Host({ name, Example }: { name: string; Example: ComponentType }) {
	const ref = useRef<HTMLElement>(null);
	useEffect(() => {
		const host = ref.current;
		if (!host) return;
		host.dataset.exampleStatus = host.querySelector("[data-example-error]") ? "error" : "mounted";
	});
	return (
		<section ref={ref} data-example={name} data-example-status="pending" className="p-8">
			<Boundary>
				<Example />
			</Boundary>
		</section>
	);
}

const wanted = new URLSearchParams(location.search).get("example");
const Example = wanted ? examples[wanted] : undefined;

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		{Example ? (
			<Host name={wanted!} Example={Example} />
		) : (
			<ul className="p-8">
				{Object.keys(examples).map((n) => (
					<li key={n}>
						<a href={"?example=" + n}>{n}</a>
					</li>
				))}
			</ul>
		)}
	</StrictMode>
);
`;
}

function freePort() {
	return new Promise((res, rej) => {
		const s = net.createServer();
		s.listen(0, "127.0.0.1", () => {
			const { port } = s.address();
			s.close(() => res(port));
		});
		s.on("error", rej);
	});
}

function obtainTarball(opts, work) {
	const target = join(work, `${PKG}.tgz`);
	const cached = process.env.CONSUMER_PACKS_DIR
		? join(process.env.CONSUMER_PACKS_DIR, `${PKG}.tgz`)
		: null;
	if (opts.tarball) {
		if (!existsSync(opts.tarball)) fail(`no tarball at ${opts.tarball}`);
		copyFileSync(opts.tarball, target);
	} else if (cached && existsSync(cached)) {
		copyFileSync(cached, target);
	} else {
		sh("pnpm", ["--filter", PKG, "run", "build"], { cwd: root });
		const out = join(work, "pack");
		mkdirSync(out);
		sh("pnpm", ["pack", "--pack-destination", out], { cwd: join(root, "react"), stdio: "ignore" });
		const tarballs = readdirSync(out).filter((f) => f.startsWith(`${PKG}-`) && f.endsWith(".tgz"));
		if (tarballs.length !== 1) fail(`expected one ${PKG} tarball, found ${tarballs.length}`);
		copyFileSync(join(out, tarballs[0]), target);
		rmSync(out, { recursive: true, force: true });
		if (process.env.CONSUMER_PACKS_DIR) copyFileSync(target, cached);
	}
	return target;
}

async function main() {
	const opts = parseArgs(process.argv.slice(2));
	const examples = collectExamples(opts.examples, opts);
	console.log(
		`docs-examples-react: ${examples.length} example(s): ${examples.map((e) => e.name).join(", ")}`
	);

	const work = realpathSync(mkdtempSync(join(tmpdir(), "fancy-ui-consumer-docs-examples-react.")));
	const app = join(work, "app");
	const cleanup = () => {
		if (opts.keep) console.log(`docs-examples-react: --keep, scratch kept at ${work}`);
		else rmSync(work, { recursive: true, force: true });
	};

	try {
		// Inside the try so the folder is removed when the guard trips.
		if ((work + sep).startsWith(realpathSync(root) + sep))
			fail(`scratch dir ${work} is inside the repo`);
		const tarball = obtainTarball(opts, work);

		// The consumer app, minus build output, specs and runner configs.
		const src = join(root, "examples/consumers/react-vite");
		mkdirSync(app, { recursive: true });
		sh("rsync", [
			"-a",
			...[
				"node_modules",
				"package-lock.json",
				".tarball",
				"dist",
				"tests",
				"docs-examples-tests",
				"test-results",
			].flatMap((p) => ["--exclude", p]),
			"--exclude",
			"playwright*.config.ts",
			`${src}/`,
			`${app}/`,
		]);

		const pkgFile = join(app, "package.json");
		const pkg = JSON.parse(readFileSync(pkgFile, "utf8"));
		if (!pkg.dependencies?.[PKG]) fail(`${PKG} is not a dependency of the react-vite app`);
		pkg.dependencies[PKG] = `file:${tarball}`;
		writeFileSync(pkgFile, JSON.stringify(pkg, null, "\t") + "\n");
		sh("npm", ["install", "--no-audit", "--no-fund"], { cwd: app });
		if (!existsSync(join(app, "node_modules", PKG, "package.json")))
			fail(`${PKG} was not installed into ${app}/node_modules`);

		// The examples, byte for byte, plus the entry that mounts them.
		mkdirSync(join(app, "src/docs-examples"), { recursive: true });
		for (const e of examples) copyFileSync(e.path, join(app, "src/docs-examples", e.file));
		writeFileSync(join(app, "src/main.tsx"), harnessSource(examples));

		// tsc --noEmit (strict, skipLibCheck off) then vite build.
		sh("npm", ["run", "build"], { cwd: app });
		console.log(`docs-examples-react: ${examples.length} example(s) type-check and build`);
		if (!opts.run) return;

		const port = await freePort();
		sh(
			join(root, "node_modules/.bin/playwright"),
			["test", "-c", join(src, "playwright.docs-examples.config.ts")],
			{
				cwd: root,
				env: {
					...process.env,
					CONSUMER_APP_DIR: app,
					CONSUMER_PORT: String(port),
					DOCS_EXAMPLES: JSON.stringify(
						examples.map(({ name, file, exportName }) => ({ name, file, exportName }))
					),
				},
			}
		);
	} finally {
		cleanup();
	}
}

// Importable for tests (collectExamples, harnessSource) without running.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main().catch((e) => {
		console.error(
			`docs-examples-react: ${e instanceof Failure ? e.message : String(e?.stack ?? e)}`
		);
		process.exitCode = 1;
	});
}
