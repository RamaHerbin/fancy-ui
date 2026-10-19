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
export const COPY_CLI_SVELTE = "npx shadcn-svelte@latest add";
export const REGISTRY_BASE_SVELTE = `${SITE_URL}/r/svelte`;

export const COPY_CLI_VUE = "npx shadcn-vue@latest add";
export const REGISTRY_BASE_VUE = `${SITE_URL}/r/vue`;

export type CopyFramework = "react" | "svelte" | "vue";

export const copyCommandFor = (name: string, framework: CopyFramework = "react") =>
	framework === "svelte"
		? `${COPY_CLI_SVELTE} ${REGISTRY_BASE_SVELTE}/${name}.json`
		: framework === "vue"
			? `${COPY_CLI_VUE} ${REGISTRY_BASE_VUE}/${name}.json`
			: `${COPY_CLI} ${REGISTRY_BASE}/${name}.json`;

/** Where the CLI writes a component, relative to the project's `ui` alias (`@/components/ui` by default). */
export const COPY_IMPORT_ROOT = "@/components/ui/fancy/components";
export const COPY_IMPORT_ROOT_SVELTE = "$lib/components/ui/fancy";
export const COPY_IMPORT_ROOT_VUE = "@/components/ui/fancy/components";
export const copyImportFor = (
	slug: string,
	names: readonly string[],
	framework: CopyFramework = "react"
) =>
	`import { ${names.join(", ")} } from "${
		framework === "svelte"
			? COPY_IMPORT_ROOT_SVELTE
			: framework === "vue"
				? COPY_IMPORT_ROOT_VUE
				: COPY_IMPORT_ROOT
	}/${slug}";`;
