<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { HTMLButtonAttributes } from "svelte/elements";

	type BaseProps = {
		/** Button label text */
		text?: string;
		/** Custom CSS class */
		class?: string;
		/** Button content (overrides text prop) */
		children?: Snippet;
		/**
		 * Plays the matching interface cue through the sound controller. Off by
		 * default; only audible once the user has enabled sound.
		 */
		sound?: boolean;
	};

	export type InteractiveHoverButtonProps = BaseProps & Omit<HTMLButtonAttributes, keyof BaseProps>;
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { sound as soundFx } from "../sound/sound.svelte.js";

	let {
		text = "Button",
		class: className,
		children,
		onclick,
		sound = false,
		...restProps
	}: InteractiveHoverButtonProps = $props();

	function handleClick(event: MouseEvent) {
		if (sound && !restProps.disabled) soundFx.play("press");
		onclick?.(event as MouseEvent & { currentTarget: EventTarget & HTMLButtonElement });
	}
</script>

<!--
	Every `transition-*` utility below is prefixed `motion-safe:`, which Tailwind
	compiles to `@media (prefers-reduced-motion: no-preference)`. The
	`group-hover:` transforms are deliberately left unprefixed: a visitor who
	asked for less motion still gets the whole hover state, it simply arrives
	instead of travelling. Gating the transforms too would leave the button
	looking broken on hover rather than calm.
-->
<button
	class={cn(
		"group bg-background relative w-auto cursor-pointer overflow-hidden rounded-full border p-2 px-6 text-center font-semibold",
		className
	)}
	onclick={handleClick}
	{...restProps}
>
	<div class="flex items-center gap-2">
		<div
			class="bg-primary size-2 rounded-lg group-hover:scale-[100.8] motion-safe:transition-all motion-safe:duration-300"
		></div>
		<span
			class="inline-block group-hover:translate-x-12 group-hover:opacity-0 motion-safe:transition-all motion-safe:duration-300"
		>
			{#if children}
				{@render children()}
			{:else}
				{text}
			{/if}
		</span>
	</div>

	<div
		aria-hidden="true"
		class="text-primary-foreground absolute top-0 z-10 flex size-full translate-x-12 items-center justify-center gap-2 opacity-0 group-hover:-translate-x-5 group-hover:opacity-100 motion-safe:transition-all motion-safe:duration-300"
	>
		<span>
			{#if children}
				{@render children()}
			{:else}
				{text}
			{/if}
		</span>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<path d="M5 12h14" />
			<path d="m12 5 7 7-7 7" />
		</svg>
	</div>
</button>
