/**
 * What the Installation page prints per framework: the stylesheet imports,
 * a first component, a composed usage, a types import and the peer
 * dependency table. The CSS and peer ranges follow each package's README and
 * `peerDependencies`; the component code follows the packages' own idioms
 * (JSX for React, a single-file component for Vue).
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
	stylesheet: `@import "tailwindcss";
@import "fancy-ui-react/tailwind.css";`,
	lang: "tsx",
	firstComponent: `// Import the stylesheet once, in your app entry or root layout.
import "fancy-ui-react/styles.css";
import { RainbowButton } from "fancy-ui-react";

export function Hero() {
	return <RainbowButton>Click me</RainbowButton>;
}`,
	usage: `import { BorderBeam, RainbowButton } from "fancy-ui-react";

export function Hero() {
	return (
		<div className="relative overflow-hidden rounded-xl border p-8">
			<RainbowButton>Click me</RainbowButton>
			<BorderBeam colorFrom="#9E7AFF" colorTo="#FE8BBB" />
		</div>
	);
}`,
	typesLang: "ts",
	types: `import { type BorderBeamProps } from "fancy-ui-react";

const beam: BorderBeamProps = { colorFrom: "#9E7AFF", colorTo: "#FE8BBB" };`,
	peers: [
		{ name: "react", range: "^18.0.0 || ^19.0.0" },
		{ name: "react-dom", range: "^18.0.0 || ^19.0.0" },
		{ name: "tailwindcss", range: "^4.0.0" },
	],
};

const vue: InstallSnippets = {
	stylesheet: `@import "tailwindcss";
@import "fancy-ui-vue/tailwind.css";
@import "fancy-ui-vue/styles.css";`,
	lang: "vue",
	firstComponent: `<script setup lang="ts">
import { RainbowButton } from "fancy-ui-vue";
</script>

<template>
	<RainbowButton>Click me</RainbowButton>
</template>`,
	usage: `<script setup lang="ts">
import { BorderBeam, RainbowButton } from "fancy-ui-vue";
</script>

<template>
	<div class="relative overflow-hidden rounded-xl border p-8">
		<RainbowButton>Click me</RainbowButton>
		<BorderBeam color-from="#9E7AFF" color-to="#FE8BBB" />
	</div>
</template>`,
	typesLang: "vue",
	types: `<script setup lang="ts">
import { BorderBeam, type BorderBeamProps } from "fancy-ui-vue";

const beam: BorderBeamProps = { colorFrom: "#9E7AFF", colorTo: "#FE8BBB" };
</script>

<template>
	<BorderBeam v-bind="beam" />
</template>`,
	peers: [
		{ name: "vue", range: "^3.5.2" },
		{ name: "tailwindcss", range: "^4.0.0" },
	],
};

export const INSTALL_SNIPPETS: Record<Framework, InstallSnippets> = { svelte, react, vue };
