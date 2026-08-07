/**
 * Catalog registry.
 *
 * Auto-collects every `<code>.ts` message file in this folder via import.meta.glob,
 * so adding a locale is just dropping a file (its default export is the catalog).
 */

import type { Catalog } from "./en.js";

const modules = import.meta.glob("./*.ts", { eager: true }) as Record<
	string,
	{ default?: Catalog }
>;

export const catalogs: Record<string, Catalog> = {};

for (const [path, mod] of Object.entries(modules)) {
	const code = path.match(/\.\/(.+)\.ts$/)?.[1];
	if (!code || code === "index" || !mod.default) continue;
	catalogs[code] = mod.default;
}
