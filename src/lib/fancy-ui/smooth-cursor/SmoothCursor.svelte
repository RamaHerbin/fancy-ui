<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { SpringConfig } from "./smooth-cursor-core.js";

	export type { SpringConfig };

	export interface SmoothCursorProps {
		/** Custom cursor snippet to replace the default arrow cursor */
		cursor?: Snippet;
		/** Spring physics configuration */
		springConfig?: SpringConfig;
		/** Additional CSS classes */
		class?: string;
	}
</script>

<script lang="ts">
	import { onMount, untrack } from "svelte";
	import { cn } from "$lib/utils.js";
	import { createSmoothCursor, type SmoothCursorEngine } from "./smooth-cursor-core.js";

	let { cursor, springConfig = {}, class: className = "" }: SmoothCursorProps = $props();

	let cursorEl: HTMLDivElement;
	let visible = $state(false);
	let engine: SmoothCursorEngine | null = null;

	onMount(() => {
		// Read the media query BEFORE creating the engine: the original wrapper
		// had two distinct reduced-motion entry points — a plain assignment at
		// mount (no snap) and a `change` handler that stopped the loop and
		// snapped. Passing the mount value as a creation option keeps
		// `setOptions({ reducedMotion })` reserved for the change event, so both
		// paths stay faithful.
		const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

		engine = createSmoothCursor(
			{ cursor: cursorEl },
			{
				springConfig: untrack(() => springConfig),
				reducedMotion: motionQuery.matches,
				onVisibleChange: (next) => {
					visible = next;
				},
			}
		);

		function onMotionChange(e: MediaQueryListEvent) {
			engine?.setOptions({ reducedMotion: e.matches });
		}

		motionQuery.addEventListener("change", onMotionChange);

		return () => {
			motionQuery.removeEventListener("change", onMotionChange);
			engine?.destroy();
			engine = null;
		};
	});

	$effect(() => {
		const next = springConfig;
		untrack(() => engine?.setOptions({ springConfig: next }));
	});
</script>

<div
	bind:this={cursorEl}
	aria-hidden="true"
	class={cn(
		"pointer-events-none fixed top-0 left-0 z-[9999]",
		visible ? "opacity-100" : "opacity-0",
		className
	)}
	style="will-change: transform; translate: -50% -50%;"
>
	{#if cursor}
		{@render cursor()}
	{:else}
		<!-- Default cursor: arrow SVG -->
		<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" focusable="false">
			<path
				fill="currentColor"
				d="M9.391 2.32C8.42 1.56 7 2.253 7 3.486V28.41c0 1.538 1.966 2.18 2.874.938l6.225-8.523a2 2 0 0 1 1.615-.82h9.69c1.512 0 2.17-1.912.978-2.844z"
			/>
		</svg>
	{/if}
</div>
