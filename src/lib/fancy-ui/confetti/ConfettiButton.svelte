<script lang="ts">
	import { getContext } from "svelte";
	import type { Snippet } from "svelte";
	import type { HTMLButtonAttributes } from "svelte/elements";
	import confetti from "canvas-confetti";
	import type { Options as ConfettiOptions } from "canvas-confetti";
	import { sound as soundFx } from "../sound/sound.svelte.js";
	import { soundFeedback } from "../sound/sound-feedback.js";

	type BaseProps = {
		options?: ConfettiOptions;
		children?: Snippet;
		/**
		 * Plays the `hover` cue on mouse/pen pointer enter and the `press` cue on
		 * click. Off by default; only audible once the user has enabled sound.
		 */
		sound?: boolean;
		/** Custom CSS class */
		class?: string;
	};

	type Props = BaseProps & Omit<HTMLButtonAttributes, keyof BaseProps>;

	let {
		options = {},
		children,
		sound = false,
		class: className,
		type = "button",
		onclick,
		...restProps
	}: Props = $props();

	// Hover cue for mouse/pen pointers only. `on: {}` binds nothing when sound is
	// off (and never the default click → press, which `handleClick` already plays).
	const hoverFeedback = $derived({
		on: sound ? { pointerenter: "hover" as const } : ({} as Record<string, never>),
		disabled: !!restProps.disabled,
	});

	const confettiContext = getContext<{ fire: (opts?: ConfettiOptions) => void } | undefined>(
		"ConfettiContext"
	);

	function handleClick(event: MouseEvent) {
		if (restProps.disabled) return;
		if (sound) soundFx.play("press");
		const target = event.currentTarget as HTMLElement;
		const rect = target.getBoundingClientRect();
		const x = rect.left + rect.width / 2;
		const y = rect.top + rect.height / 2;

		const origin = {
			x: x / window.innerWidth,
			y: y / window.innerHeight,
		};

		if (confettiContext) {
			confettiContext.fire({ ...options, origin });
		} else {
			confetti({ ...options, origin });
		}
		onclick?.(event as MouseEvent & { currentTarget: EventTarget & HTMLButtonElement });
	}
</script>

<button
	use:soundFeedback={hoverFeedback}
	class={className}
	{type}
	{...restProps}
	onclick={handleClick}
>
	{#if children}
		{@render children()}
	{/if}
</button>
