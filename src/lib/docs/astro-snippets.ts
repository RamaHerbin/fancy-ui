/**
 * The Astro section of the Installation page (Svelte framework only).
 *
 * Technical reference content, kept in English like the recipe bodies (see
 * CONTRIBUTING.md, "What stays English"); the heading is the proper noun
 * "Astro". Inline `code` is written with backticks and rendered by the page.
 *
 * The Astro consumer app (examples/consumers/astro) carries the snippets
 * verbatim, builds them with `astro build` and runs them in Chromium;
 * consumer-snippets.test.ts fails when the two drift. Its smoke also measures
 * the island cost quoted below and fails when a measurement leaves the
 * ASTRO_ISLAND_COST band, so the page cannot quote a number the build does
 * not produce.
 */

export const ASTRO_VERSIONS = {
	astro: "7.4.2",
	integration: "9.1.1",
	node: "22.23.4",
} as const;

/**
 * JavaScript a page with a single hydrated RainbowButton downloads (its island
 * module, the modules it imports and Astro's Svelte renderer), on the
 * `astro build` output: through a local .svelte wrapper vs. a `client:*`
 * directive on the package-root import. Kilobytes are 1000 bytes. The smoke
 * accepts a measurement within ASTRO_COST_TOLERANCE of these values.
 */
export const ASTRO_ISLAND_COST = {
	wrappedKB: 88,
	wrappedGzipKB: 32,
	barrelMB: 1.66,
	barrelGzipKB: 481,
} as const;

export const ASTRO_COST_TOLERANCE = 0.15;

export const ASTRO_SNIPPETS = {
	install: `npx astro add svelte
npx astro add tailwind
npm install fancy-ui-svelte`,
	config: `import { defineConfig } from "astro/config";
import svelte from "@astrojs/svelte";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
	integrations: [svelte()],
	vite: { plugins: [tailwindcss()] },
});`,
	staticUsage: `---
import { BorderBeam, Meteors } from "fancy-ui-svelte";
---

<div class="relative overflow-hidden rounded-xl border p-8">
	<Meteors />
	<BorderBeam />
</div>`,
	island: `<script lang="ts">
	import { RainbowButton } from "fancy-ui-svelte";

	let clicks = $state(0);
</script>

<RainbowButton onclick={() => clicks++}>Clicked {clicks} times</RainbowButton>`,
	islandUsage: `---
import Counter from "../islands/Counter.svelte";
---

<Counter client:visible />`,
} as const;

export type AstroGuideBlock =
	| { kind: "p"; text: string }
	| { kind: "note"; text: string }
	| { kind: "caption"; text: string }
	| { kind: "code"; lang: string; code: string };

const cost = ASTRO_ISLAND_COST;

export const ASTRO_GUIDE: { id: string; title: string; blocks: AstroGuideBlock[] } = {
	id: "astro",
	title: "Astro",
	blocks: [
		{
			kind: "p",
			text: "FancyUI runs in Astro through the official Svelte integration, with no extra package. Add the integration and Tailwind, install the package, then import the stylesheet from step 2 in your layout.",
		},
		{ kind: "code", lang: "bash", code: ASTRO_SNIPPETS.install },
		{ kind: "code", lang: "js", code: ASTRO_SNIPPETS.config },
		{
			kind: "p",
			text: "A component used without a `client:*` directive renders to HTML and CSS and ships no JavaScript. `BorderBeam`, `Marquee`, `Meteors`, and buttons without a handler work this way.",
		},
		{ kind: "code", lang: "astro", code: ASTRO_SNIPPETS.staticUsage },
		{
			kind: "p",
			text: "To hydrate a component, import it in a local `.svelte` file and put the directive on that file. Plain props cross from `.astro` as data and slots, default or named, arrive as static HTML, but functions do not serialize: handlers, callbacks and snippets that take arguments are written in the `.svelte` file.",
		},
		{ kind: "code", lang: "svelte", code: ASTRO_SNIPPETS.island },
		{ kind: "code", lang: "astro", code: ASTRO_SNIPPETS.islandUsage },
		{
			kind: "note",
			text: `Do not put the directive on a component imported from \`fancy-ui-svelte\` in an \`.astro\` file: Astro's island loads the whole module it was imported from. For a page with one \`RainbowButton\` island, the local file ships about ${cost.wrappedKB} KB of JavaScript (${cost.wrappedGzipKB} KB gzipped, Astro's Svelte runtime included); the package-root import ships about ${cost.barrelMB} MB (${cost.barrelGzipKB} KB gzipped), three.js and GSAP included, and the build can then share that chunk with the other island pages of the site.`,
		},
		{
			kind: "p",
			text: "`ClientRouter` is supported: islands are destroyed on each navigation, and `transition:persist` keeps one alive across pages.",
		},
		{
			kind: "caption",
			text: `Tested with \`astro\` ${ASTRO_VERSIONS.astro} and \`@astrojs/svelte\` ${ASTRO_VERSIONS.integration}, which need Node ${ASTRO_VERSIONS.node} or later.`,
		},
	],
};

/** Splits backtick-delimited inline code out of a guide sentence. */
export function inlineCode(text: string): { code: boolean; text: string }[] {
	return text
		.split("`")
		.map((part, i) => ({ code: i % 2 === 1, text: part }))
		.filter((part) => part.text !== "");
}
