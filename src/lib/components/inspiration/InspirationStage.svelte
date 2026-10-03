<!--
	The live layer over a FancyUI reference's poster. The demo module loads
	lazily and mounts only while two things hold: this stage owns the page's
	single live slot (`liveStage`, or `eager` on the detail page) and it is near
	the viewport. Leaving the viewport, hiding the tab or pressing Escape gives
	the slot back. Until the module is ready, or if it fails, the poster below
	stays visible — loading never shows a spinner.

	Inspired by the gallery stage this replaces (inView with hysteresis, glob
	loader), reworked around one shared slot instead of one gate per card.
-->
<script lang="ts">
	import { browser } from "$app/environment";
	import type { Component } from "svelte";
	import { inView } from "$lib/fancy-ui/_internals/motion/in-view.js";
	import type { FancyUIReference, PlaygroundValues } from "$lib/inspiration/types.js";
	import { liveStage } from "./live-stage.svelte.js";

	interface Props {
		entry: FancyUIReference;
		/** Knob values; the entry's defaults when omitted. */
		values?: PlaygroundValues;
		/** Run whenever near the viewport, without claiming the shared slot (detail page). */
		eager?: boolean;
		class?: string;
	}

	let { entry, values, eager = false, class: className = "" }: Props = $props();

	const modules = import.meta.glob("$lib/inspiration/demos/*.svelte");
	type DemoComponent = Component<{ values: PlaygroundValues }>;

	const HYSTERESIS_MS = 600;

	let near = $state(false);
	let wasNear = false;
	// Loaded module and failure are tagged with the module id, so a stage
	// reused for another entry never shows the previous entry's demo.
	let loaded = $state<{ module: string; component: DemoComponent } | null>(null);
	let failedModule = $state<string | null>(null);
	let loadingModule: string | null = null;
	const Demo = $derived(loaded?.module === entry.demo.module ? loaded.component : null);
	const failed = $derived(failedModule === entry.demo.module);

	const wanted = $derived(eager || liveStage.active === entry.slug);
	const run = $derived(wanted && near);
	const demoValues = $derived(values ?? entry.demo.defaults ?? {});

	// Mount as soon as the stage should run. Losing the slot unmounts at once,
	// so a hover handoff never runs two demos; only leaving the viewport waits
	// a moment, so scrolling along the edge does not thrash.
	let mounted = $state(false);
	$effect(() => {
		if (run) {
			mounted = true;
			return;
		}
		if (!wanted) {
			mounted = false;
			return;
		}
		const timer = setTimeout(() => (mounted = false), HYSTERESIS_MS);
		return () => clearTimeout(timer);
	});

	// Off-screen for longer than the hysteresis: hand the slot back.
	$effect(() => {
		if (eager || near || !wasNear || liveStage.active !== entry.slug) return;
		const slug = entry.slug;
		const timer = setTimeout(() => liveStage.release(slug), HYSTERESIS_MS);
		return () => clearTimeout(timer);
	});

	$effect(() => {
		const module = entry.demo.module;
		if (!mounted || Demo || failed || loadingModule === module || !browser) return;
		const loader = modules[`/src/lib/inspiration/demos/${module}.svelte`];
		if (!loader) {
			failedModule = module;
			return;
		}
		loadingModule = module;
		loader()
			.then((mod) => {
				loaded = { module, component: (mod as { default: DemoComponent }).default };
			})
			.catch(() => (failedModule = module))
			.finally(() => {
				if (loadingModule === module) loadingModule = null;
			});
	});

	// Shared-slot stages give the slot back on Escape, on a hidden tab, and
	// when they go away (unmounted, filtered out, or reused for another entry).
	$effect(() => {
		if (eager) return;
		const slug = entry.slug;
		const onVisibility = () => {
			if (document.visibilityState === "hidden") liveStage.release(slug);
		};
		const onKeydown = (event: KeyboardEvent) => {
			if (event.key === "Escape") liveStage.release(slug);
		};
		document.addEventListener("visibilitychange", onVisibility);
		window.addEventListener("keydown", onKeydown);
		return () => {
			document.removeEventListener("visibilitychange", onVisibility);
			window.removeEventListener("keydown", onKeydown);
			liveStage.release(slug);
		};
	});

	function onNear(value: boolean) {
		near = value;
		if (value) wasNear = true;
	}

	const live = $derived(mounted && !!Demo && !failed);
</script>

<div
	class="is-stage {className}"
	data-live={live || undefined}
	data-stage={entry.slug}
	use:inView={{ once: false, rootMargin: "240px 0px", threshold: 0, onChange: onNear }}
>
	{#if live && Demo}
		<svelte:boundary onerror={() => (failedModule = entry.demo.module)}>
			<div class="is-demo" data-demo-mounted={loaded?.module}>
				<Demo values={demoValues} />
			</div>
		</svelte:boundary>
	{/if}
	{#if failed}
		<span class="is-note fx-mono">Preview unavailable</span>
	{/if}
</div>

<style>
	.is-stage {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	/* Live: above the card's stretched link, so the demo receives the pointer. */
	.is-stage[data-live] {
		z-index: 2;
		pointer-events: auto;
	}

	.is-demo {
		position: absolute;
		inset: 0;
		background: var(--fx-canvas, #09090b);
		animation: is-fade 220ms var(--fx-ease, ease) both;
	}

	.is-note {
		position: absolute;
		left: 10px;
		bottom: 10px;
		padding: 2px 6px;
		border-radius: 5px;
		font-size: 10.5px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--fx-ink-3, #8f8e89);
		background: rgb(9 9 11 / 0.7);
	}

	@keyframes is-fade {
		from {
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.is-demo {
			animation: none;
		}
	}
</style>
