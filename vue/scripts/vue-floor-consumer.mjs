#!/usr/bin/env node
/**
 * Proves the Vue 3.5 floor half of the peer range, from a scratch consumer.
 *
 * `peerDependencies` advertises `vue: ^3.5.2`, so a Vue 3.5 app installs this
 * package with no warning — while the workspace pins a newer vue and the only
 * example app (the Nuxt example) needs ^3.5.40, CI otherwise only ever runs
 * one install. Every Vue-newer-than-3.5-only detail that slipped in would
 * reach a floor consumer as a console error or a broken component with a
 * green pipeline behind it.
 *
 * What this covers, and what it does not:
 *
 *  - COVERED: the DECLARATION surface. The package is packed, installed into
 *    a throwaway directory alongside `vue@3.5.2`, and a probe importing `cn`
 *    and every component export of both barrels with its `<Name>Props` type
 *    (names read off the runtime barrels, types off the checker, so `export *`
 *    re-exports are followed) is compiled with plain
 *    `tsc`, `skipLibCheck: false`. That is the half the runtime cannot reach:
 *    a type that only exists in a newer Vue (or a newer `@vue/runtime-core`)
 *    fails here.
 *  - COVERED: server rendering under Vue 3.5.2 proper, from the built
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
import {
	copyFileSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const pkg = fileURLToPath(new URL("../", import.meta.url));

/** The floor the peer range promises. Kept in step with package.json. */
// 3.5.2 is the first release whose `DefineComponent` type takes the 20
// type arguments vue-tsc emits into every `<Name>.vue.d.ts`; 3.5.0/3.5.1
// declare 19 and reject the shipped declarations (TS2707).
const VUE = "3.5.2";
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
 *
 * Measured on this package's own build (2026-09-26): 181 of 221 swept
 * export(s) server render under the Vue 3.5.2 floor — the same count
 * `smoke-dist.mjs` reads on the workspace vue. The earlier 186 of 235 was
 * inflated: the merged, shape-blind sweep counted data exports such as
 * `SOUND_CUES` (a hollow render: a warning and an empty comment) as rendered,
 * and dropped the root half of every name the cameleon barrel shares.
 */
const RENDERED_FLOOR = 181;

/**
 * Root component exports the barrel ships WITHOUT a `<Name>Props` type,
 * each mirroring the Svelte barrel it transposes. Kept exact: an entry that
 * starts exporting its Props type fails the probe until it is removed here.
 *
 *  - AppleCard: `src/lib/fancy-ui/apple-card-carousel/index.ts` re-exports
 *    only `AppleCardCarouselProps` and `AppleCardData`.
 */
const PROPS_EXEMPT = new Set(["AppleCard"]);

/**
 * How many `<Name>Props` types the probe must import, across both barrels.
 * A ratchet like `RENDERED_FLOOR`: it exists so a discovery that silently
 * finds nothing (the regex over `export { ... }` blocks did exactly that once
 * the barrel moved to `export *`) fails instead of type-checking `cn` alone.
 *
 * Measured on this package's own build (2026-09-26): 209 root + 11 cameleon.
 */
const TYPED_FLOOR = 220;

/**
 * Runs inside the scratch consumer: the runtime component names of each
 * barrel (via `dist-sweep.mjs`'s component-shape filter) and every name each
 * barrel's declaration entry exports as the TypeScript checker resolves it,
 * `export *` chains included.
 */
const NAMES_SCRIPT = `
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import * as F from "fancy-ui-vue";
import * as C from "fancy-ui-vue/cameleon";
import { componentEntries } from "./dist-sweep.mjs";
import { declaredExports } from "./declared-exports.mjs";
const pkgDir = dirname(createRequire(import.meta.url).resolve("fancy-ui-vue/package.json"));
const names = (mod) => componentEntries({ m: mod }).map(([key]) => key.slice(2)).sort();
console.log(JSON.stringify({
	root: { components: names(F), types: declaredExports(join(pkgDir, "dist/index.d.ts")) },
	cameleon: {
		components: names(C),
		types: declaredExports(join(pkgDir, "dist/cameleon/index.d.ts")),
	},
}));
`;

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

	// Derive the probe's import list from the tarball itself. The names come
	// from the RUNTIME barrels (every capitalised component-shaped export,
	// per barrel), and the type side from the TypeScript checker's view of
	// each barrel's `index.d.ts` — which follows `export *` chains. A regex over
	// the declaration text only ever saw the barrel's direct `export { cn }`
	// block, so every component re-exported with `export *` escaped the probe.
	for (const helper of ["dist-sweep.mjs", "declared-exports.mjs"]) {
		copyFileSync(new URL(`./${helper}`, import.meta.url), join(scratch, helper));
	}
	writeFileSync(join(scratch, "names.mjs"), NAMES_SCRIPT);
	const surface = JSON.parse(
		execFileSync("node", ["names.mjs"], { cwd: scratch, encoding: "utf8" })
	);
	if (!surface.root.types.includes("cn")) {
		throw new Error("dist/index.d.ts does not export cn");
	}

	const valueImports = ["cn"];
	const typeImports = { root: [], cameleon: [] };
	const probed = [];
	const missingProps = [];
	for (const barrel of ["root", "cameleon"]) {
		const types = new Set(surface[barrel].types);
		for (const name of surface[barrel].components) {
			const local = barrel === "root" ? name : `cameleon_${name}`;
			if (!types.has(name)) {
				missingProps.push(`${barrel}:${name} (runtime export with no declaration)`);
				continue;
			}
			probed.push(local);
			const exempt = barrel === "root" && PROPS_EXEMPT.has(name);
			if (types.has(`${name}Props`)) {
				if (exempt) {
					missingProps.push(
						`${barrel}:${name} now exports ${name}Props — remove it from PROPS_EXEMPT`
					);
				}
				typeImports[barrel].push(
					barrel === "root" ? `${name}Props` : `${name}Props as cameleon_${name}Props`
				);
			} else if (!exempt) {
				missingProps.push(`${barrel}:${name} (no ${name}Props type re-exported)`);
			}
		}
	}
	if (missingProps.length) {
		throw new Error(
			`the barrels break the <Name>Props tooling contract:\n  ${missingProps.join("\n  ")}`
		);
	}
	const typed = typeImports.root.length + typeImports.cameleon.length;
	if (typed < TYPED_FLOOR) {
		throw new Error(
			`only ${typed} <Name>Props type(s) reached the probe (floor ${TYPED_FLOOR}) — ` +
				`the name discovery stopped reaching the barrels' component exports`
		);
	}

	const rootValues = surface.root.components.filter((name) => probed.includes(name));
	const camValues = surface.cameleon.components
		.filter((name) => probed.includes(`cameleon_${name}`))
		.map((name) => `${name} as cameleon_${name}`);
	valueImports.push(...rootValues);
	const probeLines = [`import { ${valueImports.join(", ")} } from "fancy-ui-vue";`];
	if (camValues.length) {
		probeLines.push(`import { ${camValues.join(", ")} } from "fancy-ui-vue/cameleon";`);
	}
	if (typeImports.root.length) {
		probeLines.push(`import type { ${typeImports.root.join(", ")} } from "fancy-ui-vue";`);
	}
	if (typeImports.cameleon.length) {
		probeLines.push(
			`import type { ${typeImports.cameleon.join(", ")} } from "fancy-ui-vue/cameleon";`
		);
	}
	probeLines.push(`export const probe = [${["cn", ...probed].join(", ")}];`);
	const typeLocals = [
		...typeImports.root,
		...typeImports.cameleon.map((spec) => spec.split(" as ").pop()),
	];
	// Re-exported rather than listed in a tuple type: a re-export needs no type
	// arguments, so generic Props (`StickyScrollProps<T>`) are covered too, and
	// a name the barrel lacks is still a TS2305 at the import.
	if (typeLocals.length) probeLines.push(`export type { ${typeLocals.join(", ")} };`);
	console.log(
		`✅ probe covers cn, ${probed.length} component export(s) and ${typed} <Name>Props type(s)`
	);

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
	// The sweep is `dist-sweep.mjs`, the same one `smoke-dist.mjs` runs: each
	// barrel walked separately (they share names such as `Button`), data
	// exports such as `SOUND_CUES` filtered out by component shape, and a
	// hollow render (warning + empty comment) never counted as rendered.
	writeFileSync(
		join(scratch, "render.mjs"),
		[
			'import { createSSRApp, h } from "vue";',
			'import { renderToString } from "vue/server-renderer";',
			'import * as F from "fancy-ui-vue";',
			'import * as C from "fancy-ui-vue/cameleon";',
			'import { componentEntries, sweep } from "./dist-sweep.mjs";',
			`const RENDERED_FLOOR = ${RENDERED_FLOOR};`,
			"const result = await sweep(componentEntries({ root: F, cameleon: C }), {",
			"\tcreateSSRApp,",
			"\th,",
			"\trenderToString,",
			"});",
			"const rendered = result.rendered.length;",
			"if (rendered < RENDERED_FLOOR) {",
			"\tconsole.error(",
			"\t\t`only ${rendered} of ${result.swept} swept export(s) rendered under the vue floor ` +",
			"\t\t\t`(floor ${RENDERED_FLOOR}) — something the package ships needs a Vue newer than the ` +",
			'\t\t\t"declared peer range, or the sweep stopped reaching it"',
			"\t);",
			"\tprocess.exit(1);",
			"}",
			"console.log(",
			"\t`✅ ${rendered} of ${result.swept} swept export(s) server render under the vue floor ` +",
			"\t\t`(floor ${RENDERED_FLOOR}; ${result.hollow.length} hollow, ${result.threw.length} need props)`",
			");",
		].join("\n")
	);
	run("node", ["render.mjs"], scratch);
} finally {
	rmSync(scratch, { recursive: true, force: true });
}
