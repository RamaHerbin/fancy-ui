/**
 * Load src/lib/fancy-ui/registry.ts from a plain Node script (no SvelteKit
 * aliases, no TypeScript loader): strip the types with Vite's esbuild
 * transform and import the result as a data: module. registry.ts only has
 * type imports, so the stripped module stands on its own.
 *
 * Shared by scripts/build-component-thumbs.mjs and
 * tests/e2e/preview-health.spec.ts.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * @returns {Promise<{ registry: Record<string, { slug: string, status: string }> }>}
 */
export async function loadRegistry() {
	const registryPath = join(repoRoot, "src", "lib", "fancy-ui", "registry.ts");
	try {
		const { transformWithEsbuild } = await import("vite");
		const source = readFileSync(registryPath, "utf8");
		const { code } = await transformWithEsbuild(source, registryPath, { loader: "ts" });
		return await import(
			`data:text/javascript;base64,${Buffer.from(code, "utf8").toString("base64")}`
		);
	} catch (err) {
		throw new Error(`could not load registry.ts (${/** @type {Error} */ (err).message})`);
	}
}

/**
 * Every shipped slug (status "done"), sorted.
 *
 * @returns {Promise<string[]>}
 */
export async function loadDoneSlugs() {
	const { registry } = await loadRegistry();
	return Object.values(registry)
		.filter((c) => c.status === "done")
		.map((c) => c.slug)
		.sort();
}
