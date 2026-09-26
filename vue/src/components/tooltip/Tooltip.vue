<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { Side, Align } from "../../internals/anchor-position.js";

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
	/** Additional CSS classes, merged onto the trigger wrapper. */
	class?: HTMLAttributes["class"];
}

// A tooltip that isn't attached to something the keyboard can reach is the
// exact failure this component exists to prevent, and it fails silently
// otherwise — hovering still opens it, so it *looks* wired. Dev-only: the
// check itself has no effect on behavior, only on whether a misuse gets
// reported.
function isFocusable(el: HTMLElement): boolean {
	if ((el as HTMLButtonElement | HTMLInputElement).disabled) return false;
	if (["BUTTON", "INPUT", "SELECT", "TEXTAREA"].includes(el.tagName)) return true;
	if (el.tagName === "A" && el.hasAttribute("href")) return true;
	const tabindex = el.getAttribute("tabindex");
	return tabindex !== null && tabindex !== "-1";
}

// `import.meta.env.DEV`, read through a local shape: the package's tsconfig
// does not carry the bundler's ambient `ImportMeta` augmentation, and the
// optional chain also covers a plain-Node import where `env` is absent. The
// source gates the same warning on `import.meta.env.DEV` directly.
const DEV = (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV === true;
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, useTemplateRef, watch } from "vue";

import { cn } from "../../utils.js";
import Portal from "../../internals/Portal.vue";
import { useFancyId } from "../../internals/use-id.js";
import { useAnchorPosition } from "../../internals/use-anchor-position.js";
import { useDismissable } from "../../internals/use-dismissable.js";
import { anchored, originFor } from "../../internals/motion/anchored.js";
import { runTransition } from "../../internals/motion/animate.js";
import type { TransitionRun } from "../../internals/motion/animate.js";

defineOptions({ name: "Tooltip", inheritAttrs: false });

const {
	content,
	side = "top",
	align = "center",
	offset = 6,
	openDelay = 500,
	closeDelay = 0,
	disabled = false,
	class: className,
} = defineProps<TooltipProps>();

defineSlots<{
	/**
	 * The trigger. Must render exactly one focusable element (a button,
	 * link, `IconButton`, ...) — Tooltip attaches its hover/focus
	 * listeners and `aria-describedby` directly to it, imperatively,
	 * since there is no prop to hand them to it declaratively.
	 */
	default?(): unknown;
}>();

const tooltipId = useFancyId();

const open = ref(false);
const triggerEl = shallowRef<HTMLElement | null>(null);

// The trigger wrapper, published on the instance rather than through a prop:
// `ref` is a reserved vnode key, and this is the node the source's bindable
// `ref` pointed at.
const wrapper = useTemplateRef<HTMLSpanElement>("wrapper");
defineExpose({ ref: wrapper });

// The bubble is created by the `mounted` gate below, so this is `null` in
// `setup` and every consumer of it is a post-flush watcher.
const bubble = useTemplateRef<HTMLDivElement>("bubble");

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
//
// Plain locals, not refs: nothing renders off them — only the `open`
// decision they feed does, exactly where the source's reactivity
// re-renders markup.
let triggerHovered = false;
let contentHovered = false;
let focused = false;

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
		open.value = true;
		return;
	}
	openTimer = setTimeout(() => {
		openTimer = undefined;
		open.value = true;
	}, delay);
}

function hide() {
	clearTimers();
	if (closeDelay <= 0) {
		open.value = false;
		return;
	}
	closeTimer = setTimeout(() => {
		closeTimer = undefined;
		open.value = false;
	}, closeDelay);
}

// Called from every hover/focus/blur handler below, and — separately —
// from the watcher further down that watches `disabled` itself. That
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

// Routed through the dismiss layer on the bubble (`escape: true, outsideClick:
// false` — see the template below) rather than a keydown listener of its own,
// so Escape has exactly one implementation across every overlay in this
// family, not a second one that happens to agree with it today. The layer
// decides by stack order, not by what currently has focus, which is also why
// this closes instantly and never moves focus itself — the trigger stays
// exactly where the keyboard user left it, unlike a dismissed Popover/Dialog.
// Bypasses `closeDelay` on purpose, same as the listener this replaced:
// Escape is a deliberate "get me out of here", not a pointer drifting off
// that deserves a grace period.
function handleDismiss() {
	open.value = false;
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
// would hide the bubble only via the `v-if` gate below, leaving `open`
// itself still `true` underneath — so flipping `disabled` back to `false`
// with the pointer never having left would pop the bubble straight back,
// skipping `openDelay` entirely, since nothing would have gone through
// `show()` to schedule it.
//
// Keyed on `disabled` alone — the counterpart of the source's
// `untrack(updateVisibility)`: the hover/focus flags are plain locals, so a
// change to them never re-runs this watcher on top of the direct call each
// handler above already makes.
watch(
	() => disabled,
	() => {
		updateVisibility();
	},
	{ flush: "post" }
);

// Slot content is caller content, not something this component renders
// itself, so there is no prop to declaratively attach the hover/focus
// listeners to its root element — they're attached imperatively, to the
// wrapper's first rendered child, once it exists. Only depends on the
// wrapper node: re-attaching the same listeners every time `disabled`
// merely toggles would be pure churn now that `disabled` has its own
// watcher above.
watch(
	wrapper,
	(node, _prev, onCleanup) => {
		if (!node) return;
		const el = node.firstElementChild as HTMLElement | null;
		triggerEl.value = el;
		if (!el) return;

		if (DEV && !isFocusable(el)) {
			console.warn(
				"[Tooltip] The first element rendered by `children` is not focusable, so this tooltip is unreachable by keyboard even though it will still open on hover. Render a real interactive element (a <button>, <a href>, or similar) as the first thing inside `children`."
			);
		}

		el.addEventListener("pointerenter", handlePointerEnter);
		el.addEventListener("pointerleave", handlePointerLeave);
		el.addEventListener("focus", handleFocus);
		el.addEventListener("blur", handleBlur);

		onCleanup(() => {
			el.removeEventListener("pointerenter", handlePointerEnter);
			el.removeEventListener("pointerleave", handlePointerLeave);
			el.removeEventListener("focus", handleFocus);
			el.removeEventListener("blur", handleBlur);
		});
	},
	{ flush: "post" }
);

// Separate from the listener-wiring watcher above: this one has to react
// to `open` and `disabled`, not just the wrapper, so the attribute is only
// ever present while there is really a mounted element behind it — the
// `<div :id="tooltipId">` below shares the exact same gate. Reacting to
// `open` here rather than in the wiring watcher also keeps the listeners
// themselves from being torn down and re-attached on every open/close.
watch(
	[triggerEl, () => disabled, open] as const,
	([el, isDisabled, isOpen], _prev, onCleanup) => {
		if (!el || isDisabled || !isOpen) return;
		el.setAttribute("aria-describedby", tooltipId);
		onCleanup(() => {
			el.removeAttribute("aria-describedby");
		});
	},
	{ flush: "post" }
);

// The source's `onDestroy(clearTimers)`. `onBeforeUnmount`, never
// `onUnmounted` — the DOM is still attached, which is where an action's
// `destroy` runs.
onBeforeUnmount(clearTimers);

// The gate the bubble, the `aria-describedby` watcher and the portal all
// share.
const mounted = computed(() => open.value && !disabled);

// The placement as ACTUALLY resolved — the requested side and align until
// `computePosition` flips or clamps it away from a viewport edge. Seeded with
// the REQUESTED values by the composable rather than a hardcoded
// "bottom"/"center", so a bubble that never flips reads the right growth
// origin without depending on whether the first placement has run yet. The
// composable returns what the source kept in two `$state` locals fed by
// `onPlacement`.
//
// `align` as resolved differs from the requested alignment whenever clamping
// slid the panel along that axis — near a viewport edge the requested corner
// is no longer the one touching the anchor, and an entrance grown from it
// would expand from the far corner instead.
const placement = useAnchorPosition(bubble, () => ({
	anchor: () => triggerEl.value,
	side,
	align,
	offset,
}));

useDismissable(bubble, () => ({
	onDismiss: handleDismiss,
	escape: true,
	outsideClick: false,
}));

// An entrance and NEVER an exit — the source uses `in:` and not
// `transition:`. Instant-out is the whole point of a tooltip: a label that
// lingers on its way out makes the pointer feel sticky, and an outro would
// also delay the unmount that `closeDelay`, Escape and blur all expect to be
// immediate. That is why this is a bare `runTransition` on mount rather than
// a presence clock: there is no exit window to keep the node alive through,
// and nothing to reverse into. The open delay above is a *scheduling* delay —
// nothing is mounted while it runs — so it is not, and must not become, the
// transition's `delay`.
//
// `scale: false` keeps the entrance opacity-only, exactly as it has always
// been: a tooltip is a label, not a surface, so it has no "grew out of the
// trigger" story that a scale would tell. The origin is still written, so a
// consumer styling off `data-side` gets the same information every other
// panel exposes.
//
// `flush: "post"` runs the leg in the same pre-paint flush that created the
// node, so the bubble is never painted once at rest first. Reduced motion
// needs no rule of its own: `anchored` collapses the duration to 0 and
// `runTransition`'s falsy-duration fast path then skips `element.animate()`
// entirely — the bubble is simply there, in the frame it mounted.
watch(
	bubble,
	(node, _prev, onCleanup) => {
		if (!node) return;
		let run: TransitionRun | undefined;
		run = runTransition(
			node,
			anchored(node, { side: placement.value.side, scale: false }, { direction: "in" }),
			1,
			undefined,
			// On enter finish, abort the run: it removes the `fill: forwards`
			// so the element returns to its resting style — which *is* the
			// visible end state by construction. On the synchronous
			// reduced-motion path `run` is still unset here, and there is
			// nothing to abort.
			() => run?.abort()
		);
		onCleanup(() => run?.abort());
	},
	{ flush: "post" }
);

const wrapperClasses = computed(() => cn("ft-tooltip-trigger inline-flex", className));
</script>

<template>
	<span ref="wrapper" :class="wrapperClasses">
		<slot />
	</span>

	<!--
		`data-align` publishes the REQUESTED alignment, exactly as the source
		does; only the transform origin follows the resolved one.

		The mounted gate is OUTERMOST and the portal sits INSIDE it: the
		teleport resolves its target during the patch that creates its
		children, so the bubble is connected to the document by the time the
		anchoring, dismiss and entrance watchers run. A closed tooltip emits
		nothing at all, on the server included.
	-->
	<template v-if="mounted">
		<Portal>
			<div
				ref="bubble"
				:id="tooltipId"
				role="tooltip"
				class="ft-tooltip bg-primary text-primary-foreground pointer-events-auto z-50 rounded-[6px] px-[10px] py-[5px] text-[11px] font-medium shadow-lg"
				:data-side="placement.side"
				:data-align="align"
				:style="{ transformOrigin: originFor(placement.side, placement.align) }"
				@pointerenter="handleContentPointerEnter"
				@pointerleave="handleContentPointerLeave"
			>
				{{ content }}
			</div>
		</Portal>
	</template>
</template>
