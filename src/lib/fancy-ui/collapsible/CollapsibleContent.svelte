<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	export interface CollapsibleContentOwnProps {
		/**
		 * Keeps the children mounted while the content is closed. On by default:
		 * a closed panel stays in the DOM (inert and hidden) so server-rendered
		 * markup, find-in-page and form state survive. Pass `false` to unmount the
		 * children once the collapse has finished and mount them again on open,
		 * for content that should not run while closed (an iframe, a video).
		 */
		forceMount?: boolean;
		/** The content. */
		children?: Snippet;
		/** Additional CSS classes, merged onto the inner body so padding collapses with the panel. */
		class?: string;
		/** Element reference to the region that animates. */
		ref?: HTMLDivElement | null;
	}

	/** Native `<div>` attributes and listeners are forwarded to the region; `id`, `data-state`, `inert` and `visibility` stay the component's. */
	export type CollapsibleContentProps = CollapsibleContentOwnProps &
		Omit<HTMLAttributes<HTMLDivElement>, keyof CollapsibleContentOwnProps>;
</script>

<script lang="ts">
	import { getContext, untrack } from "svelte";
	import { cn } from "$lib/utils.js";
	import { COLLAPSIBLE_KEY, type CollapsibleContext } from "./types.js";
	import { isCollapseEnd, prefersReducedMotionNow, settleDelayMs } from "./collapsible-core.js";

	let {
		forceMount = true,
		children,
		class: className,
		ref = $bindable(null),
		ontransitionend,
		...rest
	}: CollapsibleContentProps = $props();

	// Undefined outside a Collapsible: nothing is ever open, so the content
	// stays collapsed, the same graceful degradation as the trigger.
	const context = getContext<CollapsibleContext | undefined>(COLLAPSIBLE_KEY);
	const open = $derived(context?.open ?? false);

	// "Closed and finished collapsing". Starts true for a panel that is born
	// closed, so a server-rendered closed panel is already inert and hidden. It
	// is only ever set from the settle path below and cleared the moment the
	// panel opens, which is what makes a double toggle safe: a close that gets
	// interrupted never reaches its own settle.
	let settled = $state(!(context?.open ?? false));
	const hidden = $derived(settled && !open);

	let timer: ReturnType<typeof setTimeout> | undefined;

	function clearTimer() {
		if (timer !== undefined) clearTimeout(timer);
		timer = undefined;
	}

	// Reacts to `open` only. A close settles on `transitionend`; the deadline is
	// the net for the cases where that event never comes (reduced motion, no
	// declared duration, a panel inside a hidden ancestor).
	$effect(() => {
		const isOpen = open;
		untrack(() => {
			clearTimer();
			if (isOpen) {
				settled = false;
				return;
			}
			if (settled) return;
			const timing = ref ? getComputedStyle(ref) : null;
			const delay = settleDelayMs(timing, prefersReducedMotionNow());
			if (delay === 0) {
				settled = true;
				return;
			}
			timer = setTimeout(() => {
				timer = undefined;
				settled = true;
			}, delay);
		});
		return clearTimer;
	});

	function handleTransitionEnd(
		event: TransitionEvent & { currentTarget: EventTarget & HTMLDivElement }
	) {
		if (isCollapseEnd(event) && !open) {
			clearTimer();
			settled = true;
		}
		(ontransitionend as ((e: typeof event) => void) | null | undefined)?.(event);
	}
</script>

<div
	{...rest}
	bind:this={ref}
	id={context?.contentId ?? rest.id}
	class="ft-collapsible-content grid grid-rows-[0fr] transition-[grid-template-rows] duration-[var(--ft-collapsible-duration,240ms)] ease-[cubic-bezier(0.16,1,0.3,1)] data-[state=open]:grid-rows-[1fr] motion-reduce:transition-none"
	data-state={open ? "open" : "closed"}
	inert={open ? undefined : true}
	style:visibility={hidden ? "hidden" : undefined}
	ontransitionend={handleTransitionEnd}
>
	<div class="min-h-0 overflow-hidden">
		<div class={cn("ft-collapsible-body", className)}>
			{#if children && (forceMount || !hidden)}
				{@render children()}
			{/if}
		</div>
	</div>
</div>
