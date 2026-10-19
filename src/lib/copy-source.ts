/**
 * The copy-into-your-project command, spelled once.
 *
 * The CLI name is a technical dependency of the registry channel (like a
 * package manager name), and this module is the only place that spells it.
 * It is client-safe so the docs pages can print the command; the server-side
 * registry constants re-export it.
 */

import { SITE_URL } from "$lib/site.js";

export const REGISTRY_BASE = `${SITE_URL}/r`;
export const COPY_CLI = "npx shadcn@latest add";
export const copyCommandFor = (name: string) => `${COPY_CLI} ${REGISTRY_BASE}/${name}.json`;

/** Where the CLI writes a component, relative to the project's `ui` alias (`@/components/ui` by default). */
export const COPY_IMPORT_ROOT = "@/components/ui/fancy/components";
export const copyImportFor = (slug: string, names: readonly string[]) =>
	`import { ${names.join(", ")} } from "${COPY_IMPORT_ROOT}/${slug}";`;
