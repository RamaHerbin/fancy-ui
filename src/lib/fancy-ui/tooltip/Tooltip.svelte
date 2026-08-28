<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { Side, Align } from "../_internals/anchor-position.js";

	export interface TooltipProps {
		/** The tooltip's text. Plain text only — a tooltip never holds interactive content. */
		content: string;
		/** Side of the trigger to place the tooltip on. */
		side?: Side;
		/** Alignment along the trigger's cross axis. */
		align?: Align;
		/** Gap in pixels between the trigger and the tooltip. */
		offset?: number;
		/** Delay in milliseconds before a hover opens the tooltip. Never applied to a focus open — see the README. */
		openDelay?: number;
		/** Delay in milliseconds before the tooltip closes once neither hovered nor focused. */
		closeDelay?: number;
		/** Suppresses the tooltip entirely — it never opens, on hover or focus, while true. */
		disabled?: boolean;
		/**
		 * The trigger. Must render exactly one focusable element (a button,
		 * link, `IconButton`, ...) — Tooltip attaches its hover/focus
		 * listeners and `aria-describedby` directly to it, imperatively,
		 * since there is no prop to hand them to it declaratively.
		 */
		children?: Snippet;
		/** Additional CSS classes, merged onto the trigger wrapper. */
		class?: string;
		/** Bindable reference to the trigger wrapper element. */
		ref?: HTMLElement | null;
	}
</script>

<script lang="ts">
	import { onDestroy, untrack } from "svelte";
	import { cn } from "$lib/utils.js";
	import { anchorPosition } from "../_internals/anchor-position.js";
	import { anchored, originFor } from "../_internals/motion/anchored.js";
	import { portal } from "../_internals/portal.js";
	import { dismissable } from "../_internals/dismissable.js";

	let {
		content,
		side = "top",
		align = "center",
		offset = 6,
		openDelay = 500,
		closeDelay = 0,
		disabled = false,
		children,
		class: className,
		ref = $bindable(null),
	}: TooltipProps = $props();

	const tooltipId = $props.id();

	let open = $state(false);
	let triggerEl = $state<HTMLElement | null>(null);

	// Seeded with the REQUESTED side rather than a hardcoded `"bottom"`, so a
	// bubble that never flips reads the right growth origin without depending
	// on whether `anchorPosition`'s `onPlacement` has run yet. `untrack`
	// silences the compiler's `state_referenced_locally` warning and is
	// honest about the shape: this read of `side` is deliberately one-shot,
	// and every later value — a flip, or a change to the `side` prop itself —
	// arrives through `onPlacement` below, which is the one source of truth
	// for where the bubble actually landed.
	let resolvedSide = $state<Side>(untrack(() => side));

	// The cross-axis alignment as ACTUALLY placed, reported by `anchorPosition`
	// alongside the side. It differs from the requested alignment whenever
	// clamping slid the panel along that axis — near a viewport edge the
	// requested corner is no longer the one touching the anchor, and an
	// entrance grown from it would expand from the far corner instead.
	let resolvedAlign = $state<Align>(untrack(() => align));

	// Three independent reasons to be open, each tracked on its own:
	// hovering the trigger, hovering the bubble itself, and focus. They are
	// three separate booleans rather than one shared `hovered` flag
	// specifically for the trigger/bubble pair — the pointer crosses from
	// one to the other with both briefly true at once (enter the bubble
	// before leaving the trigger), and a single shared flag would let
	// whichever side's `pointerleave` fires *last* clobber the other side's
	// `pointerenter`, closing the tooltip while the pointer is still over
	// it. `updateVisibility` is the one place that turns the trio into an
	// open/closed decision, so releasing one never closes a tooltip the
	// others still want open.
	let triggerHovered = $state(false);
	let contentHovered = $state(false);
	let focused = $state(false);

	let openTimer: ReturnType<typeof setTimeout> | undefined;
	let closeTimer: ReturnType<typeof setTimeout> | undefined;

	function clearTimers() {
		if (openTimer !== undefined) {
			clearTimeout(openTimer);
			openTimer = undefined;
		}
		if (closeTimer !== undefined) {
			clearTimeout(closeTimer);
			closeTimer = undefined;
		}
	}

	// Both `show` and `hide` clear whatever timer is currently pending
	// before scheduling their own — the fix for a rapid hover-out-hover-in:
	// without it, the leftover close timer from the "out" and the fresh
	// open timer from the "in" would both be alive at once, racing to set
	// opposite states.
	function show(delay: number) {
		clearTimers();
		if (delay <= 0) {
			open = true;
			return;
		}
		openTimer = setTimeout(() => {
			openTimer = undefined;
			open = true;
		}, delay);
	}

	function hide() {
		clearTimers();
		if (closeDelay <= 0) {
			open = false;
			return;
		}
		closeTimer = setTimeout(() => {
			closeTimer = undefined;
			open = false;
		}, closeDelay);
	}

	// Called from every hover/focus/blur handler below, and — separately —
	// from the `$effect` further down that watches `disabled` itself. That
	// second caller is why `disabled` routes through `hide()` rather than a
	// bare early return: `updateVisibility` has to be able to force an
	// already-open tooltip closed when `disabled` flips true with the
	// pointer or focus still in place, not just decline to open a new one.
	function updateVisibility() {
		if (disabled) {
			hide();
			return;
		}
		if (triggerHovered || contentHovered || focused) {
			// A keyboard user tabbing through has to see the tooltip right
			// away, not wait out a hover-tuned delay meant to stop tooltips
			// from flashing as the mouse merely passes over things — so a
			// focus-driven open always uses a delay of 0, and only a hover
			// with no focus involved waits out `openDelay`.
			show(focused ? 0 : openDelay);
		} else {
			hide();
		}
	}

	function handlePointerEnter() {
		triggerHovered = true;
		updateVisibility();
	}
	function handlePointerLeave() {
		triggerHovered = false;
		updateVisibility();
	}
	function handleFocus() {
		focused = true;
		updateVisibility();
	}
	function handleBlur() {
		focused = false;
		updateVisibility();
	}

	// Routed through `dismissable` on the bubble (`escape: true, outsideClick:
	// false` — see the template below) rather than a keydown listener of its
	// own, so Escape has exactly one implementation across every overlay in
	// this family, not a second one that happens to agree with it today.
	// `dismissable` decides by stack order, not by what currently has focus,
	// which is also why this closes instantly and never moves focus itself —
	// the trigger stays exactly where the keyboard user left it, unlike a
	// dismissed Popover/Dialog. Bypasses `closeDelay` on purpose, same as the
	// listener this replaced: Escape is a deliberate "get me out of here",
	// not a pointer drifting off that deserves a grace period.
	function handleDismiss() {
		open = false;
		clearTimers();
	}

	// The rendered tooltip bubble gets its own hover flag rather than
	// sharing the trigger's — see `triggerHovered`/`contentHovered` above.
	// Without this, moving the pointer off the trigger and onto the bubble
	// itself (when the bubble sits in the pointer's path) would read as
	// "left the trigger" and close it out from under the pointer before it
	// arrives.
	function handleContentPointerEnter() {
		contentHovered = true;
		updateVisibility();
	}
	function handleContentPointerLeave() {
		contentHovered = false;
		updateVisibility();
	}

	// The only path into `updateVisibility` that isn't a DOM event: `disabled`
	// is a prop, and toggling it doesn't fire a pointer/focus event on its
	// own. Without this, flipping `disabled` true while hovered or focused
	// would hide the bubble only via the `{#if open && !disabled}` guard
	// below, leaving `open` itself still `true` underneath — so flipping
	// `disabled` back to `false` with the pointer never having left would
	// pop the bubble straight back, skipping `openDelay` entirely, since
	// nothing would have gone through `show()` to schedule it.
	//
	// `updateVisibility` also reads `triggerHovered`/`contentHovered`/
	// `focused` — without `untrack`, this effect would pick those up as
	// dependencies too (Svelte tracks reads through function calls, not
	// just literal ones), and re-run on every hover/focus change on top of
	// the direct call each handler above already makes, double-invoking it
	// for no reason. `untrack` keeps this effect reacting to `disabled`
	// alone; the writes `updateVisibility` makes (`open` and the timers)
	// are unaffected either way.
	$effect(() => {
		disabled;
		untrack(updateVisibility);
	});

	// A tooltip that isn't attached to something the keyboard can reach is
	// the exact failure this component exists to prevent, and it fails
	// silently otherwise — hovering still opens it, so it *looks* wired.
	// Dev-only: the check itself has no effect on behavior, only on whether
	// a misuse gets reported.
	function isFocusable(el: HTMLElement): boolean {
		if ((el as HTMLButtonElement | HTMLInputElement).disabled) return false;
		if (["BUTTON", "INPUT", "SELECT", "TEXTAREA"].includes(el.tagName)) return true;
		if (el.tagName === "A" && el.hasAttribute("href")) return true;
		const tabindex = el.getAttribute("tabindex");
		return tabindex !== null && tabindex !== "-1";
	}

	// `children` is caller content, not something this component renders
	// itself, so there is no prop to declaratively attach the hover/focus
	// listeners to its root element — they're attached imperatively, to the
	// wrapper's first rendered child, once it exists. Only depends on `ref`:
	// re-attaching the same listeners every time `disabled` merely toggles
	// would be pure churn now that `disabled` has its own effect above.
	$effect(() => {
		if (!ref) return;
		const el = ref.firstElementChild as HTMLElement | null;
		triggerEl = el;
		if (!el) return;

		if (import.meta.env.DEV && !isFocusable(el)) {
			console.warn(
				"[Tooltip] The first element rendered by `children` is not focusable, so this tooltip is unreachable by keyboard even though it will still open on hover. Render a real interactive element (a <button>, <a href>, or similar) as the first thing inside `children`."
			);
		}

		el.addEventListener("pointerenter", handlePointerEnter);
		el.addEventListener("pointerleave", handlePointerLeave);
		el.addEventListener("focus", handleFocus);
		el.addEventListener("blur", handleBlur);

		return () => {
			el.removeEventListener("pointerenter", handlePointerEnter);
			el.removeEventListener("pointerleave", handlePointerLeave);
			el.removeEventListener("focus", handleFocus);
			el.removeEventListener("blur", handleBlur);
		};
	});

	// Separate from the listener-wiring effect above: this one has to react
	// to `open` and `disabled`, not just `ref`, so the attribute is only
	// ever present while there is really a mounted element behind it —
	// `<div id={tooltipId}>` below shares the exact same `{#if open &&
	// !disabled}` gate. Reacting to `open` here rather than in the wiring
	// effect also keeps the listeners themselves from being torn down and
	// re-attached on every open/close.
	$effect(() => {
		if (!triggerEl || disabled || !open) return;
		triggerEl.setAttribute("aria-describedby", tooltipId);
		return () => {
			triggerEl?.removeAttribute("aria-describedby");
		};
	});

	onDestroy(clearTimers);

	const wrapperClasses = $derived(cn("ft-tooltip-trigger inline-flex", className));
</script>

<span bind:this={ref} class={wrapperClasses}>
	{@render children?.()}
</span>

<!--
	`in:` and never `transition:`. Instant-out is the whole point of a tooltip:
	a label that lingers on its way out makes the pointer feel sticky, and an
	outro would also delay the unmount that `closeDelay`, Escape and blur all
	expect to be immediate. The open delay above is a *scheduling* delay —
	nothing is mounted while it runs — so it is not, and must not become,
	`anchored`'s transition `delay`.

	`scale: false` keeps the entrance opacity-only, exactly as it has always
	been: a tooltip is a label, not a surface, so it has no "grew out of the
	trigger" story that a scale would tell. The origin is still written, so a
	consumer styling off `data-side` gets the same information every other
	panel exposes.
-->
{#if open && !disabled}
	<div
		id={tooltipId}
		role="tooltip"
		class="ft-tooltip bg-primary text-primary-foreground pointer-events-auto z-50 rounded-[6px] px-[10px] py-[5px] text-[11px] font-medium shadow-lg"
		use:portal
		use:anchorPosition={{
			anchor: () => triggerEl,
			side,
			align,
			offset,
			onPlacement: (placed, placedAlign) => {
				resolvedSide = placed;
				resolvedAlign = placedAlign;
			},
		}}
		use:dismissable={{ onDismiss: handleDismiss, escape: true, outsideClick: false }}
		in:anchored={{ side: resolvedSide, scale: false }}
		data-side={resolvedSide}
		data-align={align}
		style:transform-origin={originFor(resolvedSide, resolvedAlign)}
		onpointerenter={handleContentPointerEnter}
		onpointerleave={handleContentPointerLeave}
	>
		{content}
	</div>
{/if}
