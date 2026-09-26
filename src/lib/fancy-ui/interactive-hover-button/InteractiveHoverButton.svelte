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
	Hover (or keyboard focus): the dot's circle opens until it fills the
	button, the resting label rolls up and out, and the hover label rolls up
	into place with its arrow a beat behind. Colours: `--ihb-fill` (the dot
	and the fill) and `--ihb-fill-foreground` (the hover label), both
	overridable from `class`. Under reduced motion the hover state arrives
	instead of travelling.
-->
<button
	class={cn(
		"ihb group bg-background relative isolate w-auto cursor-pointer overflow-hidden rounded-full border px-6 py-2.5 text-center font-semibold",
		className
	)}
	onclick={handleClick}
	{...restProps}
>
	<!-- The dot and the fill are one layer: a clipped circle that opens. -->
	<span class="ihb-fill" aria-hidden="true"></span>

	<span class="ihb-rest">
		<span class="ihb-dot-space" aria-hidden="true"></span>
		<span class="ihb-label">
			{#if children}
				{@render children()}
			{:else}
				{text}
			{/if}
		</span>
	</span>

	<span aria-hidden="true" class="ihb-hover">
		<span class="ihb-hover-label">
			{#if children}
				{@render children()}
			{:else}
				{text}
			{/if}
		</span>
		<svg
			class="ihb-arrow"
			xmlns="http://www.w3.org/2000/svg"
			width="18"
			height="18"
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
	</span>
</button>

<style>
	.ihb {
		/* Private copies: read the public variables (set from `class`, which a
		   scoped rule here would otherwise outrank), else the theme. */
		--_ihb-fill: var(--ihb-fill, var(--primary, var(--color-primary, currentColor)));
		--_ihb-fill-foreground: var(
			--ihb-fill-foreground,
			var(--primary-foreground, var(--color-primary-foreground, #fff))
		);
		/* where the dot sits, vertically centred */
		--ihb-dot-x: 1.75rem;
		--ihb-ease: cubic-bezier(0.22, 1, 0.36, 1);
	}

	.ihb-fill {
		position: absolute;
		inset: 0;
		z-index: -1;
		background: var(--_ihb-fill);
		clip-path: circle(4px at var(--ihb-dot-x) 50%);
	}

	.ihb-rest,
	.ihb-hover {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.ihb-dot-space {
		width: 8px;
		flex: none;
	}

	.ihb-hover {
		position: absolute;
		inset: 0;
		color: var(--_ihb-fill-foreground);
		opacity: 0;
		transform: translateY(70%);
	}

	.ihb-arrow {
		flex: none;
		opacity: 0;
		transform: translateX(-6px);
	}

	/* ---- hover / keyboard focus ---------------------------------------------- */

	.ihb:hover .ihb-fill,
	.ihb:focus-visible .ihb-fill {
		clip-path: circle(150% at var(--ihb-dot-x) 50%);
	}

	.ihb:hover .ihb-rest,
	.ihb:focus-visible .ihb-rest {
		opacity: 0;
		transform: translateY(-70%);
		filter: blur(4px);
	}

	.ihb:hover .ihb-hover,
	.ihb:focus-visible .ihb-hover {
		opacity: 1;
		transform: none;
	}

	.ihb:hover .ihb-arrow,
	.ihb:focus-visible .ihb-arrow {
		opacity: 1;
		transform: none;
	}

	.ihb:focus-visible {
		outline: 2px solid var(--_ihb-fill);
		outline-offset: 2px;
	}

	.ihb:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.ihb:disabled .ihb-fill {
		clip-path: circle(4px at var(--ihb-dot-x) 50%);
	}

	.ihb:disabled .ihb-rest {
		opacity: 1;
		transform: none;
		filter: none;
	}

	.ihb:disabled .ihb-hover {
		opacity: 0;
	}

	/* ---- motion: only when the visitor has not asked for less ----------------- */

	@media (prefers-reduced-motion: no-preference) {
		.ihb {
			transition: transform 0.2s var(--ihb-ease);
		}

		.ihb:active {
			transform: scale(0.97);
		}

		.ihb-fill {
			transition: clip-path 0.6s var(--ihb-ease);
		}

		.ihb-rest {
			transition:
				opacity 0.3s var(--ihb-ease),
				transform 0.5s var(--ihb-ease),
				filter 0.5s var(--ihb-ease);
		}

		.ihb-hover {
			transition:
				opacity 0.3s var(--ihb-ease),
				transform 0.5s var(--ihb-ease);
		}

		.ihb-arrow {
			transition:
				opacity 0.3s var(--ihb-ease),
				transform 0.5s var(--ihb-ease);
		}

		/* On the way in, stagger: label a beat after the fill, arrow after it. */
		.ihb:hover .ihb-hover,
		.ihb:focus-visible .ihb-hover {
			transition-delay: 60ms;
		}

		.ihb:hover .ihb-arrow,
		.ihb:focus-visible .ihb-arrow {
			transition-delay: 160ms;
		}
	}
</style>
