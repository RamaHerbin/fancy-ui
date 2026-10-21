<script lang="ts">
	import { onMount } from "svelte";
	import { AppWindow, Led, RetroButton } from "$lib/cameleon/skins/retro-os/kit/index.js";
	import { createEggsState } from "../discovery.svelte.js";
	import { EGGS, EGG_TOTAL } from "../registry.js";

	let { onclose }: { onclose: () => void } = $props();

	// The site version, read from the build define (not $lib/site.ts, which drags the registry in).
	const version = __PKG_VERSION__;
	const eggs = createEggsState(
		EGG_TOTAL,
		EGGS.filter((e) => !e.hidden).map((e) => e.id)
	);

	let root: HTMLDivElement | undefined = $state();

	onMount(() => {
		root?.querySelector<HTMLButtonElement>("button")?.focus();
	});
</script>

<div bind:this={root} class="retro-about" role="dialog" aria-label="About FancyUI" data-retro-about>
	<AppWindow filename="ABOUT.EXE" class="r-shadow-4">
		<div class="retro-about-body">
			<p class="retro-about-title">
				<Led />
				<span>FancyUI v{version}</span>
			</p>
			<p>Built with Svelte 5 + Tailwind v4</p>
			<p>Secrets found: {eggs.count} / {eggs.total}</p>
			<div class="retro-about-actions">
				<RetroButton variant="primary" size="sm" onclick={onclose}>OK</RetroButton>
			</div>
		</div>
	</AppWindow>
</div>
