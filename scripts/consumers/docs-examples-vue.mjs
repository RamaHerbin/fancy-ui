#!/usr/bin/env node
/**
 * The snippets the docs print for fancy-ui-vue (vue/docs-examples/**\/*.vue),
 * checked the way a consumer would meet them: against the PACKED package, in a
 * scratch app outside the repo.
 *
 *   node scripts/consumers/docs-examples-vue.mjs [--source <dir>] [--tarball <file>]
 *
 *   1. build + pack fancy-ui-vue (or reuse --tarball / CONSUMER_PACKS_DIR);
 *   2. copy the snippets unchanged into a scratch app, `npm install` the tarball;
 *   3. vue-tsc with strict templates against the installed package's types,
 *      skipLibCheck off, so a wrong prop / event / v-model name fails;
 *   4. mount every snippet on a dev server (Vue only warns in development) in
 *      Playwright: no Vue warning, no error, something rendered.
 *
 * `--source` points at another folder of .vue snippets (the docs site's, or a
 * fixture) so the same harness serves other callers. KEEP_CONSUMER=1 keeps the
 * scratch folder. Exit code is non-zero on any failure.
 */
import { spawnSync } from "node:child_process";
import {
	copyFileSync,
	cpSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	realpathSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, "../..");

/** Every .vue file under `dir`, as sorted POSIX paths relative to it. */
export function listExamples(dir) {
	const out = [];
	const walk = (d) => {
		for (const e of readdirSync(d, { withFileTypes: true })) {
			const full = join(d, e.name);
			if (e.isDirectory()) walk(full);
			else if (e.name.endsWith(".vue")) out.push(relative(dir, full).split(sep).join("/"));
		}
	};
	walk(dir);
	return out.sort();
}

/** Flat, selector-safe id for a snippet path (`_install/usage.vue` -> `install-usage`). */
export function exampleName(path) {
	return path
		.replace(/\.vue$/, "")
		.replace(/^_/, "")
		.replace(/\//g, "-");
}

/** The vue-tsc diagnostics located in the copied snippets; library noise is dropped. */
export function ownDiagnostics(output) {
	return output.split("\n").filter((l) => l.startsWith("src/examples/") && /error TS\d+/.test(l));
}

function fail(msg) {
	console.error(`docs-examples-vue: ${msg}`);
	process.exit(1);
}

function run(cmd, args, opts = {}) {
	const r = spawnSync(cmd, args, { stdio: "inherit", ...opts });
	if (r.status !== 0) fail(`${cmd} ${args.join(" ")} failed (${r.status ?? r.signal})`);
}

function freePort() {
	return new Promise((ok, ko) => {
		const s = createServer();
		s.once("error", ko);
		s.listen(0, "127.0.0.1", () => {
			const { port } = s.address();
			s.close(() => ok(port));
		});
	});
}

function arg(name) {
	const i = process.argv.indexOf(name);
	return i === -1 ? undefined : process.argv[i + 1];
}

function pack(work) {
	const explicit = arg("--tarball");
	if (explicit) return resolve(explicit);
	const cache = process.env.CONSUMER_PACKS_DIR;
	const out = join(work, "fancy-ui-vue.tgz");
	if (cache && existsSync(join(cache, "fancy-ui-vue.tgz"))) {
		copyFileSync(join(cache, "fancy-ui-vue.tgz"), out);
		return out;
	}
	run("pnpm", ["--filter", "fancy-ui-vue", "run", "build"], { cwd: ROOT });
	const dir = join(work, "pack");
	mkdirSync(dir);
	run("pnpm", ["pack", "--pack-destination", dir], { cwd: join(ROOT, "vue"), stdio: "ignore" });
	const found = readdirSync(dir).filter((f) => /^fancy-ui-vue-.*\.tgz$/.test(f));
	if (found.length !== 1) fail(`expected one fancy-ui-vue tarball, found ${found.length}`);
	copyFileSync(join(dir, found[0]), out);
	rmSync(dir, { recursive: true, force: true });
	if (cache) copyFileSync(out, join(cache, "fancy-ui-vue.tgz"));
	return out;
}

async function main() {
	const source = resolve(arg("--source") ?? join(ROOT, "vue/docs-examples"));
	const examples = listExamples(source);
	if (!examples.length) fail(`no .vue snippets under ${source}`);

	const work = realpathSync(mkdtempSync(join(tmpdir(), "fancy-ui-docs-examples-vue.")));
	if (work.startsWith(ROOT + sep)) fail(`scratch dir ${work} is inside the repo`);
	console.log(`docs-examples-vue: ${examples.length} snippets, scratch ${work}`);
	try {
		const tarball = pack(work);
		const app = join(work, "app");
		cpSync(join(here, "docs-examples-vue/app"), app, { recursive: true });
		for (const f of examples) {
			const to = join(app, "src/examples", f);
			mkdirSync(dirname(to), { recursive: true });
			copyFileSync(join(source, f), to);
		}
		const pkgPath = join(app, "package.json");
		const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
		pkg.dependencies["fancy-ui-vue"] = `file:${tarball}`;
		writeFileSync(pkgPath, `${JSON.stringify(pkg, null, "\t")}\n`);
		run("npm", ["install", "--no-audit", "--no-fund"], { cwd: app });
		if (!existsSync(join(app, "node_modules/fancy-ui-vue/package.json")))
			fail("fancy-ui-vue was not installed into the scratch app");

		// Type-check against the installed package's declarations.
		const tsc = spawnSync("npx", ["vue-tsc", "--noEmit", "-p", "tsconfig.json"], {
			cwd: app,
			encoding: "utf8",
		});
		const output = `${tsc.stdout ?? ""}${tsc.stderr ?? ""}`;
		const own = ownDiagnostics(output);
		if (own.length) {
			console.error(own.join("\n"));
			fail(`${own.length} type error(s) in the docs snippets`);
		}
		if (tsc.status !== 0) {
			console.error(output);
			fail(
				"vue-tsc failed (errors outside the snippets: a published declaration does not compile)"
			);
		}
		console.log("docs-examples-vue: type-checked against the packed package, strict templates");

		const port = await freePort();
		run(
			join(ROOT, "node_modules/.bin/playwright"),
			["test", "-c", join(here, "docs-examples-vue/playwright.config.ts")],
			{
				cwd: ROOT,
				env: {
					...process.env,
					CONSUMER_APP_DIR: app,
					CONSUMER_PORT: String(port),
					DOCS_EXAMPLES_COUNT: String(examples.length),
				},
			}
		);
		console.log(`docs-examples-vue: all ${examples.length} snippets mount cleanly`);
	} finally {
		if (process.env.KEEP_CONSUMER === "1") console.log(`docs-examples-vue: kept ${work}`);
		else rmSync(work, { recursive: true, force: true });
	}
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	await main();
}
