#!/usr/bin/env node
/**
 * Type-checks the docs snippets (docs-examples/) with strict templates, so a
 * wrong prop, event or v-model name fails instead of passing silently.
 *
 * Strict templates also re-check the library's own .vue sources, which the
 * package's regular `check` deliberately does not hold to that bar (its
 * templates carry data-* attributes). Only diagnostics located in
 * docs-examples/ are enforced here; a crash that reports nothing still fails.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const run = spawnSync(
	"pnpm",
	["exec", "vue-tsc", "--noEmit", "-p", "tsconfig.docs-examples.json"],
	{
		cwd: root,
		encoding: "utf8",
	}
);
const output = `${run.stdout ?? ""}${run.stderr ?? ""}`;
const own = output.split("\n").filter((line) => line.startsWith("docs-examples/"));
const diagnostics = output.split("\n").filter((line) => /error TS\d+/.test(line));

if (own.length > 0) {
	console.error(own.join("\n"));
	console.error(`\n${own.length} type error(s) in docs-examples/`);
	process.exit(1);
}
if (run.status !== 0 && diagnostics.length === 0) {
	console.error(output || "vue-tsc failed without diagnostics");
	process.exit(1);
}
console.log("docs-examples: type-checked with strict templates");
