<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface TabsContentProps {
		/** Which `TabsTrigger` shows this panel. */
		value: string;
		/**
		 * Keeps this panel mounted in the DOM (with the `hidden` attribute)
		 * even while inactive, instead of the default of unmounting it
		 * entirely. Needed for content — an iframe, a video, a form with
		 * uncommitted input — that must not remount every time the user tabs
		 * away and back.
		 */
		forceMount?: boolean;
		/** The panel's content. */
		children?: Snippet;
		/** Additional CSS classes. */
		class?: string;
		/** Element reference. */
		ref?: HTMLDivElement | null;
	}
</script>

<script lang="ts">
	import { getContext } from "svelte";
	import { cn } from "$lib/utils.js";
	import { preset } from "../_internals/motion/transitions.js";
	import { prefersReducedMotion } from "../_internals/motion/anchored.js";
	import { DURATIONS } from "../_internals/motion/tokens.js";
	import { TABS_KEY, type TabsContext } from "./types.js";

	let {
		value,
		forceMount = false,
		children,
		class: className,
		ref = $bindable(null),
	}: TabsContentProps = $props();

	// Undefined outside a Tabs root: nothing is ever "selected", so this
	// panel only renders when `forceMount` is set, matching the graceful
	// degradation every other compound piece in this library falls back to.
	const context = getContext<TabsContext | undefined>(TABS_KEY);
	const isSelected = $derived(context?.isSelected(value) ?? false);

	// An ENTRANCE, never a cross-fade, and `in:` rather than `transition:`.
	//
	// TabsContent instances are siblings the caller places by hand: there is
	// no shared container to stack an outgoing panel inside, and each panel
	// owns its own `{#if}` below. A true cross-fade would need the outgoing
	// panel taken out of flow inside a containing block this component does
	// not own and cannot create without wrapping every caller's content in a
	// layer element — a permanent structural change to every panel in the
	// library, for one 150ms dissolve. So the panel being left cuts away
	// exactly as it always did, and only the arriving one is animated: the
	// hard cut is the defect that was actually visible.
	//
	// Because `in:` never delays an unmount, nothing that observes the swap
	// changes — the previous panel is out of the DOM in the same tick the new
	// one lands, and no assertion in the suite had to be rewritten for this.
	//
	// It plays on a real selection change only, not on first render: a local
	// `in:` runs only once the block that owns it has already run, so a panel
	// that starts selected simply appears. With `forceMount` every panel is
	// mounted permanently and the entrance never plays at all after that
	// first render — correct, since `forceMount` exists precisely to keep
	// panels alive and there is no way to animate a `hidden` attribute flip.
	//
	// `prefersReducedMotion()` is called from the params expression at the
	// call site rather than stored here: Svelte re-evaluates a directive's
	// params at the instant the transition starts, so the preference is read
	// then, never at construction and never during SSR. `duration: 0` makes
	// Svelte skip `element.animate()` outright.
	const panelFade = preset("fade");
</script>

{#if isSelected || forceMount}
	<div
		bind:this={ref}
		id={context?.panelId(value)}
		role="tabpanel"
		aria-labelledby={context?.triggerId(value)}
		tabindex="0"
		hidden={!isSelected}
		class={cn("ft-tabs-content", className)}
		in:panelFade={{ duration: prefersReducedMotion() ? 0 : DURATIONS.fast }}
	>
		{#if children}
			{@render children()}
		{/if}
	</div>
{/if}
