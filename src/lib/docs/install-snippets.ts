/**
 * What the Installation page prints per framework: the stylesheet imports,
 * a first component, a composed usage, a types import and the peer
 * dependency table. The Svelte code is inline; the React and Vue code lives in
 * each package's `docs-examples/_install` folder (plain-text stylesheet, outside the per-component
 * glob of framework-snippets.ts), where the package's `check` script
 * type-checks it. Peer ranges are asserted against `peerDependencies` in the
 * unit test.
 */

import type { Framework } from "$lib/inspiration/types.js";

export interface InstallSnippets {
	stylesheet: string;
	/** Shiki language for the first-component and usage snippets. */
	lang: "svelte" | "tsx" | "vue";
	firstComponent: string;
	usage: string;
	/** Shiki language for the types snippet (a Vue example lives in an SFC). */
	typesLang: "ts" | "vue";
	types: string;
	peers: { name: string; range: string }[];
}

const reactInstall = import.meta.glob("/react/docs-examples/_install/*", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

const vueInstall = import.meta.glob("/vue/docs-examples/_install/*", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

function pick(sources: Record<string, string>, dir: "react" | "vue", file: string): string {
	const source = sources[`/${dir}/docs-examples/_install/${file}`];
	if (source === undefined) {
		throw new Error(`Missing install snippet ${dir}/docs-examples/_install/${file}`);
	}
	return source.trim();
}

const svelte: InstallSnippets = {
	stylesheet: `@import "tailwindcss";
@import "fancy-ui-svelte/tailwind.css";`,
	lang: "svelte",
	firstComponent: `<script lang="ts">
	import { RainbowButton } from 'fancy-ui-svelte';
</script>

<RainbowButton>Click me</RainbowButton>`,
	usage: `<script lang="ts">
	import { BorderBeam, RainbowButton } from 'fancy-ui-svelte';
</script>

<div class="relative overflow-hidden rounded-xl border p-8">
	<RainbowButton>Click me</RainbowButton>
	<BorderBeam colorFrom="#9E7AFF" colorTo="#FE8BBB" />
</div>`,
	typesLang: "ts",
	types: `import { type BorderBeamProps } from 'fancy-ui-svelte';

const beam: BorderBeamProps = { colorFrom: "#9E7AFF", colorTo: "#FE8BBB" };`,
	peers: [
		{ name: "svelte", range: "^5.0.0" },
		{ name: "tailwindcss", range: "^4.0.0" },
	],
};

const react: InstallSnippets = {
	stylesheet: pick(reactInstall, "react", "stylesheet.txt"),
	lang: "tsx",
	firstComponent: pick(reactInstall, "react", "first-component.tsx"),
	usage: pick(reactInstall, "react", "usage.tsx"),
	typesLang: "ts",
	types: pick(reactInstall, "react", "types.ts"),
	peers: [
		{ name: "react", range: "^18.0.0 || ^19.0.0" },
		{ name: "react-dom", range: "^18.0.0 || ^19.0.0" },
		{ name: "tailwindcss", range: "^4.0.0" },
	],
};

const vue: InstallSnippets = {
	stylesheet: pick(vueInstall, "vue", "stylesheet.txt"),
	lang: "vue",
	firstComponent: pick(vueInstall, "vue", "first-component.vue"),
	usage: pick(vueInstall, "vue", "usage.vue"),
	typesLang: "vue",
	types: pick(vueInstall, "vue", "types.vue"),
	peers: [
		{ name: "vue", range: "^3.5.2" },
		{ name: "tailwindcss", range: "^4.0.0" },
	],
};

export const INSTALL_SNIPPETS: Record<Framework, InstallSnippets> = { svelte, react, vue };
