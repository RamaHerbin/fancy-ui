#!/usr/bin/env node
// Runs every scripts/consumers/<name>.sh, one after the other, prints a
// summary table and exits non-zero if any of them failed. Files starting with
// "_" are shared helpers, not consumers.
//
//   pnpm consumers                 # all of them
//   pnpm consumers next nuxt       # only these
//
// Each package is built and packed once per run: the scripts share the
// tarballs through CONSUMER_PACKS_DIR. Exit 77 means "cannot run here" (astro.sh
// on a Node older than Astro's floor). It is honoured only for the scripts in
// MAY_SKIP, and only locally: with CI set, a skip is a failure, so the job can
// never go green without running every app.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const all = readdirSync(here)
	.filter((f) => f.endsWith(".sh") && !f.startsWith("_"))
	.map((f) => f.slice(0, -3))
	.sort();

const wanted = process.argv.slice(2);
const unknown = wanted.filter((n) => !all.includes(n));
if (unknown.length) {
	console.error(`unknown consumer(s): ${unknown.join(", ")}. Available: ${all.join(", ")}`);
	process.exit(2);
}
const names = wanted.length ? wanted : all;
if (!names.length) {
	console.error("no scripts/consumers/<name>.sh found");
	process.exit(2);
}

const MAY_SKIP = new Set(["astro"]);
const inCi = Boolean(process.env.CI);

const packs = mkdtempSync(join(tmpdir(), "fancy-ui-consumer-packs-"));
const results = [];
try {
	for (const name of names) {
		console.log(`\n=== consumer: ${name} ===\n`);
		const started = Date.now();
		const run = spawnSync("bash", [join(here, `${name}.sh`)], {
			stdio: "inherit",
			env: { ...process.env, CONSUMER_PACKS_DIR: packs },
		});
		const seconds = Math.round((Date.now() - started) / 1000);
		const skipped = run.status === 77 && MAY_SKIP.has(name) && !inCi;
		const ok = run.status === 0 || skipped;
		let detail = "";
		if (!ok) {
			detail = run.error ? String(run.error) : `exit ${run.status ?? run.signal}`;
			if (run.status === 77) detail += inCi ? " (skip is a failure in CI)" : " (skip not allowed)";
		}
		results.push({ name, ok, skipped, seconds, detail });
	}
} finally {
	rmSync(packs, { recursive: true, force: true });
}

const width = Math.max(8, ...results.map((r) => r.name.length));
console.log(`\n${"consumer".padEnd(width)}  result  time`);
console.log(`${"-".repeat(width)}  ------  ------`);
for (const r of results) {
	const time = `${r.seconds}s`.padStart(6);
	console.log(
		`${r.name.padEnd(width)}  ${(r.skipped ? "skip" : r.ok ? "pass" : "FAIL").padEnd(6)}  ${time}${r.detail ? `  ${r.detail}` : ""}`
	);
}
const failed = results.filter((r) => !r.ok);
const skipped = results.filter((r) => r.skipped).length;
const skipNote = skipped ? ` (${skipped} skipped)` : "";
console.log(
	failed.length
		? `\n${failed.length} of ${results.length} consumer(s) failed${skipNote}`
		: `\nall ${results.length - skipped} consumers passed${skipNote}`
);
process.exit(failed.length ? 1 : 0);
