import svelteRaw from "../../../../../CHANGELOG.md?raw";
import reactRaw from "../../../../../react/CHANGELOG.md?raw";
import vueRaw from "../../../../../vue/CHANGELOG.md?raw";
import { buildChangelogPackages } from "$lib/components/docs/changelog-packages.js";

export function load() {
	return {
		changelogPackages: buildChangelogPackages({ svelte: svelteRaw, react: reactRaw, vue: vueRaw }),
	};
}
