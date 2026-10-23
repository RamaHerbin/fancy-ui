#!/usr/bin/env node
// Runs every scripts/consumers/<name>.sh, one after the other, prints a
// summary table and exits non-zero if any of them failed. Files starting with
// "_" are shared helpers, not consumers.
//
//   pnpm consumers                 # all of them
//   pnpm consumers next nuxt       # only these
//   pnpm consumers --shard 2/3     # every third consumer, starting at the second
//   pnpm consumers --shard 2/3 --list   # print that selection, run nothing
//
// --shard deals the sorted list round-robin (consumer i goes to shard
// i % n + 1), which is how CI spreads them over runners: a consumer added to
// this folder lands in a shard by itself, with no list in ci.yml to forget.
// Each package is built and packed once per run: the scripts share the
// tarballs through CONSUMER_PACKS_DIR.
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

const args = process.argv.slice(2);
const listAt = args.indexOf("--list");
const listOnly = listAt !== -1;
if (listOnly) args.splice(listAt, 1);
const shardAt = args.indexOf("--shard");
let shard = null;
if (shardAt !== -1) {
	const match = /^([1-9]\d*)\/([1-9]\d*)$/.exec(args[shardAt + 1] ?? "");
	if (!match || Number(match[1]) > Number(match[2])) {
		console.error(`--shard expects k/n with 1 <= k <= n, got "${args[shardAt + 1] ?? ""}"`);
		process.exit(2);
	}
	shard = { k: Number(match[1]), n: Number(match[2]) };
	args.splice(shardAt, 2);
}
const wanted = args;
const unknown = wanted.filter((n) => !all.includes(n));
if (unknown.length) {
	console.error(`unknown consumer(s): ${unknown.join(", ")}. Available: ${all.join(", ")}`);
	process.exit(2);
}
if (shard && wanted.length) {
	console.error("--shard and consumer names are exclusive");
	process.exit(2);
}
const names = shard
	? all.filter((_, i) => i % shard.n === shard.k - 1)
	: wanted.length
		? wanted
		: all;
if (shard)
	console.log(`shard ${shard.k}/${shard.n} of ${all.join(", ")}: ${names.join(", ") || "(empty)"}`);
if (!names.length && !shard) {
	console.error("no scripts/consumers/<name>.sh found");
	process.exit(2);
}
// --list: print the selection and stop (what a CI shard would run).
if (listOnly) {
	for (const name of names) console.log(name);
	process.exit(0);
}

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
		const ok = run.status === 0;
		results.push({
			name,
			ok,
			seconds,
			detail: ok ? "" : run.error ? String(run.error) : `exit ${run.status ?? run.signal}`,
		});
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
		`${r.name.padEnd(width)}  ${(r.ok ? "pass" : "FAIL").padEnd(6)}  ${time}${r.detail ? `  ${r.detail}` : ""}`
	);
}
const failed = results.filter((r) => !r.ok);
console.log(
	failed.length
		? `\n${failed.length} of ${results.length} consumer(s) failed`
		: `\nall ${results.length} consumers passed`
);
process.exit(failed.length ? 1 : 0);
