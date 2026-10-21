<script lang="ts">
	import EggQuietNote from "./EggQuietNote.svelte";
	import { EGGS } from "./registry.js";
	import { eggRuntime } from "./runtime.svelte.js";
	import { EGG_OVERLAY_Z, type EggId } from "./types.js";

	// What the always-present live region says when an overlay opens; the payload
	// captions themselves are plain text so each event is announced once.
	const SPOKEN: Partial<Record<EggId, string>> = {
		matrix: "Wake up. Press Escape or Leave to exit.",
		retro: "Shutting down the retro desktop…",
	};

	const announcement = $derived.by(() => {
		const active = eggRuntime.active;
		if (active) {
			const title = EGGS.find((e) => e.id === active.id)?.title ?? active.id;
			return SPOKEN[active.id] ?? `${title}. Press Escape to stop.`;
		}
		const note = eggRuntime.note;
		return note ? `${note.title} found.` : "";
	});
</script>

<!-- Mounted from the start: screen readers skip a live region inserted with its text. -->
<p class="sr-only" role="status" data-egg-announcer>{announcement}</p>

<!-- Keyed by the active egg itself: one egg replacing another remounts the
     payload (and runs the old one's teardown) instead of reusing it. A keyed
     each, not {#key}: a block's item never turns null while it is torn down. -->
{#each eggRuntime.active ? [eggRuntime.active] : [] as active (active)}
	{@const Comp = active.component}
	<!-- Pointer-transparent host: payloads that need input opt back in on their own root. -->
	<div
		class="pointer-events-none fixed inset-0"
		style="z-index: {EGG_OVERLAY_Z}"
		data-egg-overlay={active.id}
	>
		<Comp ctx={active.ctx} />
	</div>
{/each}
{#if eggRuntime.note}
	<EggQuietNote title={eggRuntime.note.title} />
{/if}
