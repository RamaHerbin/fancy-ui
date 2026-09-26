#!/usr/bin/env node
/**
 * Proves the Vue 3.5 floor half of the peer range, from a scratch consumer.
 *
 * `peerDependencies` advertises `vue: ^3.5.0`, so a Vue 3.5 app installs this
 * package with no warning — while the workspace pins a newer vue and the only
 * example app (the Nuxt example) needs ^3.5.40, CI otherwise only ever runs
 * one install. Every Vue-newer-than-3.5-only detail that slipped in would
 * reach a floor consumer as a console error or a broken component with a
 * green pipeline behind it.
 *
 * What this covers, and what it does not:
 *
 *  - COVERED: the DECLARATION surface. The package is packed, installed into
 *    a throwaway directory alongside `vue@3.5.0`, and a probe importing `cn`
 *    and every component export's `<Name>Props` type is compiled with plain
 *    `tsc`, `skipLibCheck: false`. That is the half the runtime cannot reach:
 *    a type that only exists in a newer Vue (or a newer `@vue/runtime-core`)
 *    fails here.
 *  - COVERED: server rendering under Vue 3.5.0 proper, from the built
 *    artifact, via `@vue/server-renderer` sourced from the same floor
 *    install (never the workspace's newer copy).
 *  - NOT covered here: the client runtime. That is the other half of the
 *    `vue-3-5` CI job, which re-installs the whole workspace on Vue 3.5 with
 *    a job-local `pnpm-workspace.yaml` override and runs the package's own
 *    `check` / `test` / `build` against it.
 *
 * Run from `vue/` after `pnpm run build`. Needs network access for `npm
 * install`, so it is a CI step rather than part of `build`.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const pkg = fileURLToPath(new URL("../", import.meta.url));

/** The floor the peer range promises. Kept in step with package.json. */
const VUE = "3.5.0";
const TYPESCRIPT = "~5.8.0";

/**
 * How many barrel exports must survive a bare server render under the floor
 * version. A ratchet, not a target: each porting wave raises it to whatever
 * that wave actually rendered, so a later change that quietly stops a
 * component from rendering on Vue 3.5 cannot slip past.
 *
 * It starts at 0 because the package starts with no components, and "at least
 * one" would be an unmeetable gate on an empty barrel rather than a real one.
 * Raise it in the same commit that lands the components it counts.
 */
const RENDERED_FLOOR = 0;

const scratch = mkdtempSync(join(tmpdir(), "fancy-ui-vue-floor-"));
const run = (command, args, cwd) =>
	execFileSync(command, args, { cwd, stdio: "inherit", encoding: "utf8" });

try {
	console.log(`Vue ${VUE} floor consumer probe in ${scratch}`);

	// Pack the real artifact rather than linking the workspace: a consumer
	// gets the tarball, and the tarball is what the `files` allow-list
	// produced.
	run("npm", ["pack", "--pack-destination", scratch], pkg);
	const tarball = readdirSync(scratch).find((name) => name.endsWith(".tgz"));
	if (!tarball) throw new Error("npm pack produced no tarball");

	writeFileSync(
		join(scratch, "package.json"),
		JSON.stringify({ name: "vue-floor-consumer", private: true, version: "0.0.0", type: "module" })
	);

	run(
		"npm",
		[
			"install",
			"--no-audit",
			"--no-fund",
			`vue@${VUE}`,
			`typescript@${TYPESCRIPT}`,
			`./${tarball}`,
		],
		scratch
	);

	// The installed version, asserted: npm resolving a newer vue here would
	// make every check below pass for the wrong reason.
	const installed = JSON.parse(
		readFileSync(join(scratch, "node_modules", "vue", "package.json"), "utf8")
	);
	if (installed.version !== VUE) {
		throw new Error(`expected vue@${VUE} in the scratch consumer, got ${installed.version}`);
	}
	console.log(`✅ scratch consumer resolved vue@${installed.version}`);

	// Derive the probe's import list from the tarball's own declarations:
	// every named export off `dist/index.d.ts`, split into `cn` (a plain
	// value/function) and everything else (a component, whose `<Name>Props`
	// type is re-exported alongside it per the package's tooling contract).
	// Must work when the barrel exports only `cn`.
	const dts = readFileSync(
		join(scratch, "node_modules", "fancy-ui-vue", "dist", "index.d.ts"),
		"utf8"
	);
	const exportNames = new Set();
	for (const match of dts.matchAll(/export\s*\{([^}]*)\}/g)) {
		for (let name of match[1].split(",")) {
			name = name.trim();
			if (!name) continue;
			name = name.split(/\s+as\s+/).pop().trim();
			if (name) exportNames.add(name);
		}
	}
	const componentNames = [...exportNames]
		.filter((name) => name !== "cn" && /^[A-Z]/.test(name))
		.sort();
	if (!exportNames.has("cn")) {
		throw new Error("dist/index.d.ts does not export cn");
	}

	const valueImports = ["cn", ...componentNames].join(", ");
	const typeImports = componentNames.map((name) => `${name}Props`).join(", ");
	const probeLines = [`import { ${valueImports} } from "fancy-ui-vue";`];
	if (typeImports) probeLines.push(`import type { ${typeImports} } from "fancy-ui-vue";`);
	probeLines.push("export const probe = [cn" + (componentNames.length ? ", " + componentNames.join(", ") : "") + "];");
	if (typeImports) {
		probeLines.push(
			`type _AssertProps = [${componentNames.map((name) => `${name}Props`).join(", ")}];`
		);
	}

	// `bundler` resolution and `skipLibCheck: false`: the templates that hide
	// this class of defect are exactly the ones that set skipLibCheck true.
	writeFileSync(
		join(scratch, "tsconfig.json"),
		JSON.stringify(
			{
				compilerOptions: {
					target: "ES2022",
					lib: ["ES2022", "DOM", "DOM.Iterable"],
					module: "ESNext",
					moduleResolution: "bundler",
					strict: true,
					skipLibCheck: false,
					noEmit: true,
					types: [],
				},
				include: ["probe.ts"],
			},
			null,
			2
		)
	);
	writeFileSync(join(scratch, "probe.ts"), probeLines.join("\n") + "\n");
	run("npx", ["tsc", "-p", "tsconfig.json"], scratch);
	console.log(`✅ every emitted declaration compiles against vue@${VUE}`);

	// A runtime pass too: Vue 3.5's own server-renderer over both barrels
	// (the main entry and cameleon), sourced from this scratch install so the
	// renderer itself is the floor version, not the workspace's newer copy.
	writeFileSync(
		join(scratch, "render.mjs"),
		[
			'import { createSSRApp, h } from "vue";',
			'import { renderToString } from "vue/server-renderer";',
			'import * as F from "fancy-ui-vue";',
			'import * as C from "fancy-ui-vue/cameleon";',
			`const RENDERED_FLOOR = ${RENDERED_FLOOR};`,
			"let rendered = 0;",
			"let swept = 0;",
			"for (const [name, value] of Object.entries({ ...F, ...C })) {",
			'\tif (!/^[A-Z]/.test(name)) continue;',
			'\tif (typeof value !== "function" && typeof value !== "object") continue;',
			"\tswept += 1;",
			"\ttry {",
			"\t\tconst app = createSSRApp({ render: () => h(value, {}, { default: () => \"x\" }) });",
			"\t\tawait renderToString(app);",
			"\t\trendered += 1;",
			"\t} catch {}",
			"}",
			"if (rendered < RENDERED_FLOOR) {",
			"\tconsole.error(",
			"\t\t`only ${rendered} of ${swept} swept export(s) rendered under the vue floor ` +",
			"\t\t\t`(floor ${RENDERED_FLOOR}) — something the package ships needs a Vue newer than the ` +",
			'\t\t\t"declared peer range, or the sweep stopped reaching it"',
			"\t);",
			"\tprocess.exit(1);",
			"}",
			"console.log(",
			"\t`✅ ${rendered} of ${swept} swept export(s) server render under the vue floor ` +",
			"\t\t`(floor ${RENDERED_FLOOR})`",
			");",
		].join("\n")
	);
	run("node", ["render.mjs"], scratch);
} finally {
	rmSync(scratch, { recursive: true, force: true });
}
