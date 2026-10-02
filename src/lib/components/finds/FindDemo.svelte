<!--
	The live stage of a Find card. Loads the demo module lazily and mounts it
	only while the card is near the viewport — a page of thirty running
	specimens would otherwise open every WebGL context and animation loop at
	once. Two extra gates: `mount: "intent"` demos (fluid, canvas) wait for the
	visitor's first pointer or focus on the stage, and under reduced motion
	those same demos stay static with a note pointing at the docs.
-->
<script lang="ts">
	import { browser } from "$app/environment";
	import type { Component } from "svelte";
	import { inView } from "$lib/fancy-ui/_internals/motion/in-view.js";
	import { createReducedMotion } from "$lib/fancy-ui/_internals/motion/media-query.svelte.js";
	import type { LiveFind, PlaygroundValues } from "$lib/finds/types.js";

	interface Props {
		find: LiveFind;
		values: PlaygroundValues;
		/** Mount immediately, skipping the viewport and intent gates (tests, previews). */
		eager?: boolean;
	}

	let { find, values, eager = false }: Props = $props();

	const modules = import.meta.glob("$lib/finds/demos/*.svelte");

	type DemoComponent = Component<{ values: PlaygroundValues }>;

	const reduced = createReducedMotion();
	$effect(() => reduced.start());

	let near = $state(false);
	// The mount mode is fixed per find; reading it once at construction is the intent.
	// svelte-ignore state_referenced_locally
	let intended = $state(find.mount !== "intent");
	let Demo = $state<DemoComponent | null>(null);
	let loadError = $state(false);
	let loading = false;

	/* Reduced motion only blocks the heavy intent demos; the rest honour the
	   preference inside the component. */
	const blocked = $derived(find.mount === "intent" && reduced.current);
	const active = $derived(!blocked && (eager || (near && intended)));

	// Hysteresis: mount as soon as the card is near, unmount only after it has
	// been far for a while, so scrolling along the boundary does not thrash.
	let mounted = $state(false);
	$effect(() => {
		if (active) {
			mounted = true;
			return;
		}
		const timer = setTimeout(() => (mounted = false), 600);
		return () => clearTimeout(timer);
	});

	$effect(() => {
		if (!mounted || Demo || loading || !browser) return;
		const loader = modules[`/src/lib/finds/demos/${find.demo}.svelte`];
		if (!loader) {
			loadError = true;
			return;
		}
		loading = true;
		loader()
			.then((mod) => {
				Demo = (mod as { default: DemoComponent }).default;
			})
			.catch(() => (loadError = true))
			.finally(() => (loading = false));
	});

	function intend() {
		intended = true;
	}
</script>

<div
	class="finds-stage relative h-full w-full"
	use:inView={{ once: false, rootMargin: "240px 0px", threshold: 0, onChange: (v) => (near = v) }}
	onpointerenter={intend}
	onfocusin={intend}
	ontouchstart={intend}
>
	{#if blocked}
		<div class="finds-stage-note lp-mono">
			<span>MOTION REDUCED</span>
			<span style="color:var(--lp-grey-5)">OPEN THE DOCS TO RUN IT</span>
		</div>
	{:else if loadError}
		<div class="finds-stage-note lp-mono"><span>DEMO UNAVAILABLE</span></div>
	{:else if mounted && Demo}
		<Demo {values} />
	{:else if !intended}
		<div class="finds-stage-note lp-mono">
			<span class="finds-stage-reticle" aria-hidden="true"></span>
			<span>MOVE TO EXPLORE</span>
		</div>
	{:else}
		<div class="finds-stage-note lp-mono" aria-hidden="true">
			<span style="color:var(--lp-grey-5)">{find.title.toUpperCase()}</span>
		</div>
	{/if}
</div>

<style>
	.finds-stage-note {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 10px;
		font-size: 10.5px;
		letter-spacing: 0.18em;
		color: var(--lp-grey-3);
		pointer-events: none;
		text-align: center;
		padding: 0 16px;
	}

	.finds-stage-reticle {
		display: block;
		width: 26px;
		height: 26px;
		border: 1.5px solid var(--lp-accent);
		border-radius: 2px;
	}
</style>
