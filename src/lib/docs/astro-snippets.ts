/**
 * What the Installation page prints in its Astro section. The Astro consumer
 * app (examples/consumers/astro) carries the same code verbatim, builds it with
 * `astro build` and runs it in Chromium; consumer-snippets.test.ts fails when
 * the two drift. The measurements quoted next to them come from that app.
 */

export const ASTRO_VERSIONS = {
	astro: "7.4.2",
	integration: "9.1.1",
	node: "22.23.4",
} as const;

/**
 * JavaScript shipped for a page with one hydrated RainbowButton (Astro's
 * Svelte runtime included), measured on the `astro build` output: through a
 * local .svelte wrapper vs. a directive on the package-root import.
 */
export const ASTRO_ISLAND_COST = {
	wrapped: "88 KB (32 KB gzip)",
	barrel: "1.66 MB (481 KB gzip)",
} as const;

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
