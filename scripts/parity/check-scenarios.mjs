#!/usr/bin/env node
/**
 * Parity scenario coverage gate.
 *
 * Every registry slug whose status is `done` (the `sound` family excepted, as in
 * the parity matrices) must have both a React and a Vue scenario in the parity
 * bench apps, or an explicit entry in scripts/parity/scenario-skips.json giving
 * the reason it is left out. A skip entry for a slug that has both files, or
 * for a slug that is not a done registry slug, is stale and fails too.
 *
 *   node scripts/parity/check-scenarios.mjs            check the repository
 *   node scripts/parity/check-scenarios.mjs --self-test  run the built-in checks
 */

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Registry slugs that are not component folders (mirrors check-readme-count.mjs). */
const NON_COMPONENT = new Set(["sound"]);

/** Slugs of the registry entries whose `status` is "done". */
export function doneSlugs(src) {
	const start = src.search(/export\s+const\s+registry\s*:/);
	if (start === -1) throw new Error("Could not locate `export const registry` in registry.ts");
	const body = src.slice(start);
	const end = body.search(/^\};/m);
	const text = body.slice(0, end === -1 ? undefined : end);
	const done = [];
	let slug = null;
	for (const line of text.split("\n")) {
		const open = line.match(/^\t"?([A-Za-z0-9_-]+)"?: \{$/);
		if (open) {
			slug = open[1];
			continue;
		}
		if (slug && /^\t\tstatus: "done",?$/.test(line)) {
			if (!NON_COMPONENT.has(slug)) done.push(slug);
			slug = null;
		}
	}
	return done;
}

/**
 * Problems for `slugs` given the scenario files that exist (`has(kind, slug)`)
 * and the skips map ({ slug: reason }).
 */
export function problemsFor(slugs, has, skips) {
	const problems = [];
	const known = new Set(slugs);
	for (const slug of slugs) {
		const missing = ["react", "vue"].filter((k) => !has(k, slug));
		const skip = skips[slug];
		if (missing.length === 0) {
			if (skip !== undefined)
				problems.push(`${slug}: has both scenarios but is listed in scenario-skips.json`);
		} else if (skip === undefined) {
			problems.push(
				`${slug}: no ${missing.join(" or ")} scenario and no entry in scenario-skips.json`
			);
		} else if (typeof skip !== "string" || skip.trim() === "") {
			problems.push(`${slug}: scenario-skips.json entry needs a reason`);
		}
	}
	for (const slug of Object.keys(skips)) {
		if (!known.has(slug))
			problems.push(`${slug}: listed in scenario-skips.json but not a done registry slug`);
	}
	return problems;
}

function selfTest() {
	const fake =
		'export const registry: R = {\n\t"a-b": {\n\t\tstatus: "done",\n\t},\n\tsound: {\n\t\tstatus: "done",\n\t},\n\tc: {\n\t\tstatus: "planned",\n\t},\n\td: {\n\t\tstatus: "done",\n\t},\n};\n';
	const slugs = doneSlugs(fake);
	const parse = slugs.join() === "a-b,d";
	const both = () => true;
	const onlyReact = (k, s) => k === "react" || s !== "a-b";
	const clean = problemsFor(slugs, both, {}).length === 0;
	const missing = problemsFor(slugs, onlyReact, {}).length === 1;
	const skipped = problemsFor(slugs, onlyReact, { "a-b": "why" }).length === 0;
	const noReason = problemsFor(slugs, onlyReact, { "a-b": " " }).length === 1;
	const stale = problemsFor(slugs, both, { "a-b": "why", zzz: "why" }).length === 2;
	if (!(parse && clean && missing && skipped && noReason && stale)) {
		console.error("check-scenarios: self-test failed");
		process.exit(1);
	}
	console.log("check-scenarios: self-test ok");
}

function main() {
	if (process.argv.includes("--self-test")) selfTest();
	const slugs = doneSlugs(readFileSync(join(repoRoot, "src/lib/fancy-ui/registry.ts"), "utf8"));
	const skips = JSON.parse(
		readFileSync(join(repoRoot, "scripts/parity/scenario-skips.json"), "utf8")
	);
	const has = (kind, slug) =>
		existsSync(
			join(
				repoRoot,
				kind === "react"
					? `examples/parity-react/src/scenarios/${slug}.tsx`
					: `examples/parity-vue/src/scenarios/${slug}.vue`
			)
		);
	const problems = problemsFor(slugs, has, skips);
	if (problems.length) {
		console.error(`check-scenarios: ${problems.length} problem(s)\n` + problems.join("\n"));
		process.exit(1);
	}
	console.log(
		`check-scenarios: ${slugs.length} done slugs, ${Object.keys(skips).length} skipped with a reason`
	);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
