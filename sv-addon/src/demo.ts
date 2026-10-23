/**
 * The demo the add-on writes: SSR-safe components only (no WebGL), styled through the
 * package's Tailwind tokens, so a working page proves the dependency and the CSS wiring.
 */
export function demoSource(language: "ts" | "js"): string {
	const lang = language === "ts" ? ' lang="ts"' : "";
	return `<script${lang}>
	import { BorderBeam, Button, LineShadowText, RainbowButton } from "fancy-ui-svelte";

	let clicks = $state(0);
</script>

<main class="bg-background text-foreground mx-auto flex max-w-xl flex-col gap-6 p-8">
	<h1 class="text-5xl font-bold tracking-tight">
		<LineShadowText text="FancyUI" />
	</h1>
	<p class="text-muted-foreground">
		fancy-ui-svelte is installed and its Tailwind entry is wired. Browse the components at
		<a class="underline" href="https://fancy-ui.rama.app/docs/components">fancy-ui.rama.app</a>.
	</p>

	<div class="flex flex-wrap items-center gap-3">
		<RainbowButton onclick={() => clicks++}>Click me</RainbowButton>
		<Button onclick={() => (clicks = 0)}>Reset</Button>
		<span data-testid="fancy-clicks">clicks: {clicks}</span>
	</div>

	<div class="relative overflow-hidden rounded-xl border p-6">
		Border beam
		<BorderBeam />
	</div>
</main>
`;
}

/** Vite (no SvelteKit): the demo is a component the user renders where they want. */
export const VITE_DEMO_PATH = "fancy-ui-demo/FancyDemo.svelte";
