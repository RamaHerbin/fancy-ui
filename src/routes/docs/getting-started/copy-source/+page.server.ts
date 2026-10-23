import {
	OUTSIDE_ITEMS,
	REACT_EXCLUSIONS,
	SVELTE_EXCLUSIONS,
	VUE_EXCLUSIONS,
} from "$lib/server/registry/exclusions.js";
import type { Exclusion } from "$lib/server/registry/exclusions.js";
import type { PageServerLoad } from "./$types";

const rules = (list: readonly Exclusion[]) => list.map(({ label, reason }) => ({ label, reason }));

/** The named exclusion lists the registry build applies, for the page's last section. */
export const load: PageServerLoad = () => ({
	exclusions: {
		svelte: [
			...OUTSIDE_ITEMS.svelte.map(({ path, reason }) => ({ label: path, reason })),
			...rules(SVELTE_EXCLUSIONS),
		],
		react: [
			...OUTSIDE_ITEMS.react.map(({ path, reason }) => ({ label: path, reason })),
			...rules(REACT_EXCLUSIONS),
		],
		vue: [
			...OUTSIDE_ITEMS.vue.map(({ path, reason }) => ({ label: path, reason })),
			...rules(VUE_EXCLUSIONS),
		],
	},
});
