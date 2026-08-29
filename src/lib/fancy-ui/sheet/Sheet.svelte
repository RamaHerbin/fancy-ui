<script lang="ts" module>
	import type { Snippet } from "svelte";

	export type SheetSide = "left" | "right" | "top" | "bottom";
	export type SheetSize = "sm" | "md" | "lg";

	export interface SheetProps {
		/** Whether the sheet is open; bindable. */
		open?: boolean;
		/** Called with the new value whenever the sheet opens or closes. */
		onOpenChange?: (open: boolean) => void;
		/** Edge of the viewport the panel slides in from. */
		side?: SheetSide;
		/** Heading rendered in the header and wired to `aria-labelledby`. */
		title?: string;
		/** Supporting text under the title, wired to `aria-describedby`. */
		description?: string;
		/** Whether Escape, the scrim and the close button can close the sheet. */
		dismissible?: boolean;
		/** Panel width (left/right sides) or height (top/bottom sides). */
		size?: SheetSize;
		/** Panel body content. */
		children?: Snippet;
		/** Content pinned below the body, e.g. actions. */
		footer?: Snippet;
		/** Additional CSS classes merged onto the panel. */
		class?: string;
		/** Bindable element reference to the panel. */
		ref?: HTMLDivElement | null;
		/**
		 * Plays the `close` cue through the sound controller when the sheet is
		 * dismissed. Off by default; only audible once the user has enabled
		 * sound.
		 */
		sound?: boolean;
	}
</script>

<script lang="ts">
	import type { TransitionConfig } from "svelte/transition";
	import { cn } from "$lib/utils.js";
	import { portal } from "../_internals/portal.js";
	import { focusTrap } from "../_internals/focus-trap.js";
	import { dismissable } from "../_internals/dismissable.js";
	import { scrollLock } from "../_internals/scroll-lock.js";
	import {
		anchored,
		markSurfaceState,
		prefersReducedMotion,
	} from "../_internals/motion/anchored.js";
	import { DURATIONS, JS_EASINGS } from "../_internals/motion/tokens.js";
	import { sound as soundFx } from "../sound/sound.svelte.js";

	let {
		open = $bindable(false),
		onOpenChange,
		side = "right",
		title,
		description,
		dismissible = true,
		size = "md",
		children,
		footer,
		class: className,
		ref = $bindable(null),
		sound = false,
	}: SheetProps = $props();

	// One seed per instance, suffixed for title/description — same approach
	// FormField settled on: $props.id() is SSR-stable (uid() from
	// _internals/id.ts is not, and this can render on the server the moment a
	// caller flips `open` true during SSR).
	const uid = $props.id();
	const titleId = $derived(title ? `${uid}-title` : undefined);
	const descriptionId = $derived(description ? `${uid}-description` : undefined);

	function close() {
		if (!open) return;
		open = false;
		if (sound) soundFx.play("close");
		onOpenChange?.(false);
	}

	// Handed over by `focusTrap` the moment the trap arms; called at
	// `outrostart`, which is the dismiss instant on EVERY close path (Escape,
	// the scrim, the close button, a caller's own `bind:open` write). Waiting
	// for the trap's own `destroy()` would leave a keyboard user on `<body>`
	// for the whole length of the slide-out, because Svelte sets `inert` on
	// this panel the instant the exit starts.
	let returnFocusNow: (() => void) | null = null;

	// The other half of that handover, called at `introstart`. A sheet
	// reopened DURING its exit reverses the outro instead of remounting, so
	// `use:focusTrap` is never re-created: without this the panel would come
	// back `aria-modal` and interactive with focus left on the trigger
	// behind it, and the eager return already spent for the life of the
	// instance.
	let rearmFocusTrap: (() => void) | null = null;

	function handleIntroStart(event: Event) {
		markSurfaceState(event, "open");
		rearmFocusTrap?.();
	}

	function handleOutroStart(event: Event) {
		markSurfaceState(event, "closing");
		returnFocusNow?.();
	}

	// There is no scoped `<style>` block in this file any more. Every rule it
	// used to carry was the entrance being replaced: four `@keyframes` slides,
	// one scrim fade, the `@media (prefers-reduced-motion: no-preference)`
	// gate around them, and the `.ft-sheet-panel { transform: translate(0,0) }`
	// resting rule, which the JS transition below makes redundant — it emits
	// no transform at rest. `data-side` survives that deletion because it
	// drives POSITION_CLASSES semantics for consumers, not just the keyframes
	// it used to select.
	//
	// The one place this component owns motion. Not `anchored`: that helper is
	// scale+opacity by design and deliberately carries no translate term, and
	// a sheet's whole gesture is travel. Not a pixel-distance preset either —
	// a sheet has to clear its own edge whatever its size, which only `%`
	// expresses.
	//
	// The exit does NOT halve its travel the way the scale rung does. A sheet
	// that slid half-way off the viewport and then vanished would read worse
	// than one that simply leaves; it is a named exception to the half-delta
	// exit rule rather than an oversight.
	function edgeSlide(
		_node: Element,
		params: { side: SheetSide; entering: boolean }
	): TransitionConfig {
		const reduced = prefersReducedMotion();
		const entering = params.entering;
		const axis = params.side === "left" || params.side === "right" ? "X" : "Y";
		const sign = params.side === "left" || params.side === "top" ? -1 : 1;
		return {
			// Reduced motion collapses this to 0, which makes Svelte call
			// `on_finish()` synchronously and never touch `element.animate()` —
			// so the close is exactly as synchronous as it was before the sheet
			// animated out at all.
			duration: reduced ? 0 : entering ? DURATIONS.base : DURATIONS.exit,
			easing: entering ? JS_EASINGS.out : JS_EASINGS.in,
			// `u = 1 - t`: fully out at t=0, resting at t=1. No opacity term — a
			// sheet leaves by travelling, and fading it as well reads as two
			// gestures fighting.
			css: (_t, u) => `transform: translate${axis}(${sign * 100 * u}%)`,
		};
	}

	const POSITION_CLASSES: Record<SheetSide, string> = {
		left: "inset-y-0 left-0 border-r border-border",
		right: "inset-y-0 right-0 border-l border-border",
		top: "inset-x-0 top-0 border-b border-border",
		bottom: "inset-x-0 bottom-0 border-t border-border",
	};

	// Literal Tailwind class strings (not template-built at runtime) so the
	// Tailwind v4 source scanner — which reads this file as text, not as
	// evaluated JS — can see every candidate class it needs to generate.
	const WIDTH_CLASSES: Record<SheetSize, string> = {
		sm: "w-[20rem] max-w-[90vw] h-dvh",
		md: "w-[24rem] max-w-[90vw] h-dvh",
		lg: "w-[32rem] max-w-[90vw] h-dvh",
	};
	const HEIGHT_CLASSES: Record<SheetSize, string> = {
		sm: "h-[14rem] max-h-[85vh] w-full",
		md: "h-[18rem] max-h-[85vh] w-full",
		lg: "h-[24rem] max-h-[85vh] w-full",
	};

	const isHorizontal = $derived(side === "left" || side === "right");
	const dimensionClasses = $derived(isHorizontal ? WIDTH_CLASSES[size] : HEIGHT_CLASSES[size]);

	const panelClasses = $derived(
		cn(
			"ft-sheet-panel bg-popover text-popover-foreground fixed z-50 flex flex-col gap-4 p-4 shadow-2xl",
			POSITION_CLASSES[side],
			dimensionClasses,
			className
		)
	);
</script>

{#if open}
	<!--
	  Each top-level node is portalled independently rather than sharing one
	  portal-wrapper div around both. Actions on a node only run once that
	  node is fully built, but a *child's* action can still run before its
	  *parent's* — so a focus-trap action nested inside a portal wrapper would
	  try to focus into a subtree that the wrapper's own portal action has not
	  relocated into `document.body` yet, and `.focus()` on a still-detached
	  element is a silent no-op. Putting `use:portal` directly on this panel,
	  ahead of `use:focusTrap` in source order, guarantees the panel is
	  already attached to the document by the time focus-trap tries to focus
	  into it.

	  The scrim fades on opacity alone (`scale: false`) while the panel
	  travels, and both run the same clock, so they leave together and
	  Svelte's "destroy the branch when the LAST transition finishes" rule is
	  a tie rather than a straggler.
	-->
	<div
		class="ft-sheet-scrim fixed inset-0 z-50 bg-black/60"
		use:portal
		aria-hidden="true"
		transition:anchored={{
			entering: open,
			scale: false,
			duration: DURATIONS.base,
			exitDuration: DURATIONS.exit,
		}}
	></div>
	<!--
	  `use:scrollLock` sits here rather than on the scrim, and is an action
	  rather than an `$effect`, for the release timing: an action's
	  `destroy()` is delayed by the outro, so the page stays locked until the
	  panel has actually finished sliding out instead of unlocking the instant
	  `open` flips and leaving the page scrollable under a scrim still on
	  screen.

	  ONE bidirectional `transition:` directive, never a split `in:`/`out:`
	  pair: a bidirectional directive passes the in-flight counterpart's
	  current position into the fresh call, so a sheet reopened mid-exit
	  continues from where it is instead of snapping off-screen first.
	  `entering: open` is what tells the transition which way it is going —
	  Svelte reports `direction: "both"` for a bidirectional directive, and
	  the params are read fresh (outside any reactive context) at the moment
	  each direction starts.

	  `data-state` is a STATIC literal, changed only by `markSurfaceState`
	  from the two handlers below. Svelte marks this branch inert before it
	  plays the outro and the scheduler skips inert effects, so a reactive
	  `data-state={…}` would never reach the DOM on a real close. `inert`
	  itself is not written by hand: Svelte sets it on any element carrying a
	  `transition:` for the whole exit, which is exactly what a closing modal
	  wants.
	-->
	<div
		bind:this={ref}
		class={panelClasses}
		role="dialog"
		aria-modal="true"
		aria-labelledby={titleId}
		aria-describedby={descriptionId}
		use:portal
		use:scrollLock
		use:focusTrap={{
			onActivate: (returnNow, rearm) => {
				returnFocusNow = returnNow;
				rearmFocusTrap = rearm;
			},
		}}
		use:dismissable={{
			onDismiss: close,
			escape: dismissible,
			outsideClick: dismissible,
			active: () => open,
		}}
		transition:edgeSlide={{ side, entering: open }}
		data-state="open"
		data-side={side}
		onintrostart={handleIntroStart}
		onoutrostart={handleOutroStart}
	>
		{#if title || dismissible}
			<div class="ft-sheet-header flex items-start justify-between gap-4">
				{#if title}
					<h2 id={titleId} class="text-[15px] font-semibold">{title}</h2>
				{/if}
				{#if dismissible}
					<button
						type="button"
						class="ft-sheet-close text-muted-foreground hover:text-foreground cursor-pointer text-[13px] leading-none"
						aria-label="Close"
						onclick={close}
					>
						✕
					</button>
				{/if}
			</div>
		{/if}
		{#if description}
			<p id={descriptionId} class="text-muted-foreground text-[12.5px] leading-relaxed">
				{description}
			</p>
		{/if}
		<div class="ft-sheet-body flex flex-1 flex-col gap-3 overflow-y-auto">
			{@render children?.()}
		</div>
		{#if footer}
			<div class="ft-sheet-footer flex justify-end gap-2">
				{@render footer()}
			</div>
		{/if}
	</div>
{/if}
