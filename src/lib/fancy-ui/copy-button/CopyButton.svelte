<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { ButtonVariant, ButtonSize } from "../button/types.js";

	export interface CopyButtonProps {
		/** The text written to the clipboard on activation */
		value: string;
		/** Idle label */
		label?: string;
		/** Label shown for `resetMs` after a successful copy */
		copiedLabel?: string;
		/** How long the copied state holds before reverting, in milliseconds */
		resetMs?: number;
		/** Passed straight through to the underlying Button */
		variant?: ButtonVariant;
		/** Passed straight through to the underlying Button */
		size?: ButtonSize;
		/** Disables the button and blocks the copy */
		disabled?: boolean;
		/** Drops the visible label, moving it to `aria-label` instead */
		iconOnly?: boolean;
		/** Called with the value and whether the write actually succeeded */
		onCopy?: (value: string, ok: boolean) => void;
		/**
		 * Overrides the default icon + label content. The success skin (border,
		 * background, text colour) and the disabled/copy wiring still apply — set
		 * `iconOnly` too if the custom content has no readable text, so the button
		 * keeps an accessible name.
		 */
		children?: Snippet;
		/** Additional CSS classes */
		class?: string;
		/** Element reference. Matches Button's own ref type, since CopyButton forwards it there. */
		ref?: HTMLButtonElement | HTMLAnchorElement | null;
		/**
		 * Plays the matching interface cue through the sound controller. Off by
		 * default; only audible once the user has enabled sound.
		 */
		sound?: boolean;
	}
</script>

<script lang="ts">
	import { untrack } from "svelte";
	import { cn } from "$lib/utils.js";
	import Button from "../button/Button.svelte";
	import { createCopy } from "../_internals/clipboard.svelte.js";
	import { sound as soundFx } from "../sound/sound.svelte.js";

	let {
		value,
		label = "Copy",
		copiedLabel = "Copied",
		resetMs = 2000,
		variant = "outline",
		size = "md",
		disabled = false,
		iconOnly = false,
		onCopy,
		children,
		class: className,
		ref = $bindable(null),
		sound = false,
	}: CopyButtonProps = $props();

	// Read once, on purpose: `createCopy` takes its reset delay as a constructor
	// argument, not a reactive input, so `resetMs` is not meant to be retuned
	// after the button has mounted. `untrack` says so rather than leaving a
	// compiler hint behind.
	const copyState = createCopy(untrack(() => resetMs));

	// Reads nothing, so it runs once and its teardown is the unmount cleanup.
	$effect(() => copyState.destroy);

	const currentLabel = $derived(copyState.copied ? copiedLabel : label);

	const classes = $derived(
		cn("ft-copybtn", copyState.copied && "ft-copybtn--copied border", className)
	);

	async function handleClick() {
		// `copy()` resolves false instead of throwing on a denied permission or a
		// missing clipboard API — that outcome is reported to the caller honestly,
		// not swallowed into a silent no-op.
		const ok = await copyState.copy(value);
		if (sound) soundFx.play(ok ? "copy" : "error");
		onCopy?.(value, ok);
	}
</script>

{#snippet copyIcon()}
	<svg
		class="size-4"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
		<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
	</svg>
{/snippet}

{#snippet checkIcon()}
	<svg
		class="size-4"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<polyline points="20 6 9 17 4 12" />
	</svg>
{/snippet}

<Button
	bind:ref
	{variant}
	{size}
	{disabled}
	label={iconOnly ? currentLabel : undefined}
	class={classes}
	iconStart={children ? undefined : copyState.copied ? checkIcon : copyIcon}
	onclick={handleClick}
>
	{#if children}
		{@render children()}
	{/if}
	<!-- `aria-live` carries the announcement; `aria-label` on the button (set
	     above when icon-only) covers assistive tech that only reads the name
	     once. Mounted unconditionally, even when `children` replaces the visible
	     content — a custom `children` snippet has no way of its own to say the
	     copy landed, and colour alone is a sighted-only signal. Hidden whenever
	     something else already owns the visible label (icon-only, or a custom
	     `children`); otherwise this span *is* the visible label. -->
	<span aria-live="polite" class={iconOnly || children ? "sr-only" : undefined}>{currentLabel}</span
	>
</Button>

<style>
	/*
	 * `--ft-status-done` is the family's actual "operation landed" vocabulary —
	 * the same token ToolCall, ToolTimeline, AgentPlan, SubagentList, CodeDiff,
	 * ApprovalCard, AiDataTable, TerminalBlock, ContextRing and RecommendationCard
	 * all read. Reusing it (fallback hue included, not the mockup's) means a
	 * copy confirmation sitting next to a tool-call or plan success indicator on
	 * the same page reads as one palette, and retinting the token once moves
	 * every success surface in the library together, this one included.
	 *
	 * `:global()` is required, not stylistic: the classes below land on the
	 * `<button>`/`<a>` that Button.svelte renders inside its own template, which
	 * is outside this component's scoped tree, so a normal scoped selector would
	 * never match it.
	 */
	:global(.ft-copybtn) {
		--ft-copybtn-success: var(
			--ft-status-done,
			light-dark(oklch(0.5 0.14 145), oklch(0.72 0.15 145))
		);
	}

	/* Unlayered author CSS beats Tailwind's `@layer utilities` regardless of
	   selector order or the `:hover` state Button's own variant classes add, so
	   there is no need for a separate hover rule to keep the success skin from
	   flickering back to the idle variant's colours on pointer-over. */
	:global(.ft-copybtn--copied) {
		border-color: color-mix(in oklab, var(--ft-copybtn-success) 35%, transparent);
		background-color: color-mix(in oklab, var(--ft-copybtn-success) 10%, transparent);
		color: var(--ft-copybtn-success);
	}
</style>
