<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface DrawerProps {
	/** Whether the drawer is open. Two-way through `v-model:open`. */
	open?: boolean;
	/** Called with the new value whenever the drawer opens or closes. */
	onOpenChange?: (open: boolean) => void;
	/** Heading rendered in the header and wired to `aria-labelledby`. */
	title?: string;
	/**
	 * Accessible name for the dialog when no `title` is rendered. Ignored
	 * when `title` is set, since `aria-labelledby` already supplies the
	 * name.
	 */
	ariaLabel?: string;
	/** Supporting text under the title, wired to `aria-describedby`. */
	description?: string;
	/** Whether Escape, the scrim and the close button can close the drawer. */
	dismissible?: boolean;
	/** Whether dragging the handle down past the threshold closes the drawer. */
	swipeToClose?: boolean;
	/** Additional CSS classes merged onto the panel. */
	class?: HTMLAttributes["class"];
	/**
	 * Plays the `close` cue through the sound controller when the drawer is
	 * dismissed, including a committed swipe. Off by default; only audible
	 * once the user has enabled sound.
	 */
	sound?: boolean;
}

// Fixed pixel distance rather than a percentage of the panel's own
// height: the panel's rendered height depends on its content, so a
// percentage threshold would make the same physical drag distance close
// the drawer sometimes and not others. A flat distance also keeps the
// gesture's tests deterministic without needing real layout from jsdom.
const DISMISS_THRESHOLD_PX = 96;
// Matches the transition-duration on `.ft-drawer-panel--releasing` below.
const SPRING_BACK_MS = 200;
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";

import { cn } from "../../utils.js";
import Portal from "../../internals/Portal.vue";
import { composeRefs } from "../../internals/dom/compose-refs.js";
import { useDismissable } from "../../internals/use-dismissable.js";
import { useFocusTrap } from "../../internals/use-focus-trap.js";
import { useScrollLock } from "../../internals/use-scroll-lock.js";
import { useFancyId } from "../../internals/use-id.js";
import { anchored, prefersReducedMotion } from "../../internals/motion/anchored.js";
import { usePresence } from "../../internals/motion/presence.js";
import { DURATIONS, JS_EASINGS } from "../../internals/motion/tokens.js";
import type { TransitionSpec } from "../../internals/motion/transitions.js";
import { useSoundCue } from "../../sound/use-sound.js";

defineOptions({ name: "Drawer", inheritAttrs: false });

const props = withDefaults(defineProps<DrawerProps>(), {
	dismissible: true,
	swipeToClose: true,
	sound: false,
});

// The counterpart of the source's bindable `open`: writable from inside, kept
// in step with a caller driving it from outside, and free to move on its own
// when nobody is listening.
const open = defineModel<boolean>("open", { default: false });

defineSlots<{
	/** Panel body content. */
	default?: () => unknown;
	/** Content pinned below the body, e.g. actions. */
	footer?: () => unknown;
}>();

// One seed per instance, suffixed for title/description — SSR-stable.
const uid = useFancyId();
const titleId = computed(() => (props.title ? `${uid}-title` : undefined));
const descriptionId = computed(() => (props.description ? `${uid}-description` : undefined));

// A no-op while `sound` is false, so the call site below stays unguarded, and
// the preference is read inside the returned function rather than in a render
// path.
const playCue = useSoundCue(() => props.sound);

function close() {
	// Every dismissal — Escape, the scrim, the close button, a committed
	// swipe — funnels through here, while a caller writing the model to false
	// never does, and a second Escape landing during the exit is already gone
	// by the time it arrives.
	if (!open.value) return;
	open.value = false;
	playCue("close");
	props.onOpenChange?.(false);
}

// Swiping is a second way to trigger the same `dismissible` decision the
// close button, scrim and Escape already respect — a drawer marked
// non-dismissible can't be swiped away either, only closed
// programmatically by the caller.
const canSwipe = computed(() => props.dismissible && props.swipeToClose);

// `dragY` is a live pixel offset applied as an inline transform while a
// pointer drag is in progress; it is not layout (no height/top changes),
// so dragging never triggers reflow of the page behind the drawer.
const dragY = ref(0);
let dragging = false;
// True for the short window after a released drag springs back to 0 —
// the only time a transition is applied to `transform`, so live dragging
// itself always tracks the pointer with zero lag.
const releasing = ref(false);
let activePointerId: number | null = null;
let dragStartY = 0;
let springBackTimer: ReturnType<typeof setTimeout> | undefined;

// The drag offset is deliberately NOT zeroed on a past-threshold release
// (see `handlePointerUp`) — it is the exit's start point. The reset therefore
// happens on the way back IN, and lands before paint.  Without it a drawer
// swiped shut would reopen already pushed down by the last swipe's distance.
//
// Declared BEFORE `usePresence` on purpose: both watchers are `flush: "post"`
// and run in creation order, so the offset is already back at 0 by the time
// the presence clock mounts the panel and its entrance leg reads it.
watch(
	() => open.value,
	(isOpen) => {
		if (isOpen) dragY.value = 0;
	},
	{ flush: "post" }
);

// Convention C-1: a plain sink, written by the composed function ref below.
// The panel is created by `presence.mounted`, so it is `null` in `setup` and
// every consumer of it is a post-flush watcher.
const panel = shallowRef<HTMLDivElement | null>(null);

// Convention C-4: exactly where the source declares its bindable `ref`.
defineExpose({ ref: panel });

// Returns the two functions the source hands out through `onActivate`: the
// eager return, and the re-arm. Its identity is stable from `setup`, so the
// two presence hooks below can call it before the trap has attached.
const trap = useFocusTrap(panel);

// The one place this component owns motion, and the other half of the
// swipe gesture. Not `anchored`: that helper is scale+opacity by design
// and carries no translate term, and a drawer's whole gesture is travel.
// Not a pixel distance either — the panel's height depends on its
// content, and only `%` clears its own edge whatever that height is.
//
// The exit does not halve its travel the way the scale rung does: a
// drawer that slid half-way down and then vanished reads worse than one
// that simply leaves. A named exception, not an oversight.
//
// `from` is where the panel is at the instant the exit starts, read
// straight off the live `dragY` rather than from a value captured on the
// way into `close()`. A caller writing the model to false — mid-drag
// included — never goes through `close()` at all, and a captured offset
// would then still be 0 while the panel's inline transform sat at the
// finger's position: the drawer would snap back to rest and only then slide
// out. `dragY` is already correct on every path: 0 for a scrim click,
// Escape and the close button, and left exactly where the finger let go
// for a past-threshold release. At `t = 1` the panel sits exactly there;
// at `t = 0` it is a full height below the viewport. One continuous motion
// rather than a snap back followed by a slide. On the way in `from` is
// always 0: an entrance starts off-screen and ends at rest, and a stale
// offset from an earlier swipe must not become the resting position.
function drawerSlide(_node: Element, params?: { entering: boolean }): TransitionSpec {
	const reduced = prefersReducedMotion();
	const entering = params?.entering ?? false;
	const from = entering ? 0 : dragY.value;
	return {
		delay: 0,
		// Reduced motion collapses this to 0, which makes `runTransition`
		// finish synchronously and never touch `element.animate()` — so the
		// close is exactly as synchronous as it was before the drawer
		// animated out at all.
		duration: reduced ? 0 : entering ? DURATIONS.base : DURATIONS.exit,
		easing: entering ? JS_EASINGS.out : JS_EASINGS.in,
		css: (t, u) => `transform: translateY(calc(${from}px * ${t} + 100% * ${u}))`,
	};
}

const presence = usePresence(() => open.value, {
	// The two halves of the focus handshake, at the two moments the source
	// puts them: intro start → rearm, outro start → returnFocusNow.
	//
	// `returnFocusNow` at the dismiss instant is the whole point: it is
	// called on EVERY close path (Escape, the scrim, the close button, a
	// past-threshold swipe, a caller's own model write). Waiting for the
	// trap's own destroy would leave a keyboard user on `<body>` for the
	// whole length of the slide-out, because the closing panel is made inert
	// the instant the exit starts.
	//
	// `rearm` is the other half. A drawer reopened DURING its exit reverses
	// instead of remounting, so the trap is never re-created: without this
	// the panel would come back `aria-modal` and interactive with focus left
	// on the trigger behind it, and the eager return already spent for the
	// life of the instance.
	onEnterStart: () => trap.rearm(),
	onExitStart: () => trap.returnFocusNow(),
});

// C-7, and the ONE thing this component adds to the D-V6 gate. A `<Teleport>`
// has no server output of its own: the renderer writes a pair of anchors into
// the stream and files the panel in a separate teleport buffer. Nothing in the
// app subtree can hydrate that panel, so a drawer left OPEN across a server
// render would have the client's hydration pass walk a subtree the server
// never put in the app's own HTML — a mismatch Vue warns about in development
// and, worse, does not repair in production.
//
// So the portal is withheld until the component is mounted: the server render
// and the hydration render both emit nothing, which is parity, and the panel
// arrives on the first post-hydration patch. This is exactly what the React
// sibling does — its portal target resolves in a layout effect and the portal
// renders `null` until then, so an open-on-the-server drawer paints after
// mount there too. It costs nothing on the open path callers actually take
// (`open` flips true long after mount, and `presence.mounted` is the gate that
// matters), and it is not a stand-in for the mounted gate: both conditions are
// required.
const portalReady = ref(false);
onMounted(() => {
	portalReady.value = true;
});

// LAW: release at exit END, never at exit start. `presence.mounted` stays true
// through the whole slide-out, so the page stays locked until the panel has
// actually gone instead of unlocking the instant `open` flips and leaving the
// page scrollable under a scrim still on screen. NEVER `() => open.value`.
useScrollLock(() => presence.mounted);

// `active` stays a GETTER (convention C-2): the layer must stop being TOP of
// the stack the instant `open` flips, while remaining ON the stack for the
// whole exit, so a second Escape during the slide-out falls through to
// whatever is underneath instead of being swallowed.
useDismissable(panel, () => ({
	onDismiss: close,
	escape: props.dismissible,
	outsideClick: props.dismissible,
	active: () => open.value,
}));

// Built ONCE in `setup`: the identity must not change between patches, or Vue
// detaches and reattaches the node and throws the in-flight leg away. The
// panel needs both the element sink above and the presence leg.
//
// ONE bidirectional leg per node, never a split enter/exit pair: a reopen
// mid-exit resumes from the position the close actually reached instead of
// snapping off-screen first. The params factory is called with `entering` at
// the instant each leg starts — a single two-way transition cannot tell the
// two directions apart on its own, and `open` can.
const panelRef = composeRefs<HTMLDivElement>(
	panel,
	presence.register("panel", drawerSlide, (entering) => ({ entering }))
);

// The scrim fades on opacity alone (`scale: false`) while the panel travels,
// and both run the same clock, so they leave together and the "unmount the
// subtree when the LAST transition finishes" rule is a tie rather than a
// straggler.
const scrimRef = composeRefs<HTMLDivElement>(
	presence.register("scrim", anchored, (entering) => ({
		entering,
		scale: false,
		duration: DURATIONS.base,
		exitDuration: DURATIONS.exit,
	}))
);

function handlePointerDown(event: PointerEvent) {
	if (!canSwipe.value) return;
	if (event.pointerType === "mouse" && event.button !== 0) return;
	clearTimeout(springBackTimer);
	activePointerId = event.pointerId;
	dragStartY = event.clientY;
	dragging = true;
	releasing.value = false;
	// Keeps receiving pointermove/pointerup on this element even if the
	// pointer strays outside it mid-drag (a fast, slightly diagonal
	// swipe easily leaves a few-pixel-tall handle row).
	(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
}

function handlePointerMove(event: PointerEvent) {
	if (!dragging || event.pointerId !== activePointerId) return;
	// Only downward drag moves the panel; upward movement clamps at 0
	// rather than lifting the drawer past its resting position.
	dragY.value = Math.max(0, event.clientY - dragStartY);
}

function releaseCapture(event: PointerEvent) {
	(event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
}

// Below the threshold: spring back rather than sticking wherever the pointer
// let go — `releasing` arms the transition that animates `dragY`'s jump back
// to 0 (skipped entirely under reduced motion, where it simply snaps). Both
// writes land in the same patch, so the class is in the DOM alongside the
// transform change rather than a frame behind it.
function springBack() {
	releasing.value = true;
	dragY.value = 0;
	springBackTimer = setTimeout(() => {
		releasing.value = false;
	}, SPRING_BACK_MS);
}

function handlePointerUp(event: PointerEvent) {
	if (!dragging || event.pointerId !== activePointerId) return;
	dragging = false;
	activePointerId = null;
	releaseCapture(event);

	if (dragY.value > DISMISS_THRESHOLD_PX) {
		// `dragY` is NOT zeroed here. Zeroing it used to be harmless
		// because removal was instant; with an exit it would snap the
		// panel back up to rest and then slide it down — two gestures
		// where the user made one. `close()` captures the offset as the
		// exit's start point instead, so the slide-out carries on from
		// exactly where the finger let go.
		close();
		return;
	}

	springBack();
}

function handlePointerCancel(event: PointerEvent) {
	if (!dragging || event.pointerId !== activePointerId) return;
	dragging = false;
	activePointerId = null;
	releaseCapture(event);
	springBack();
}

// A drag released below the threshold arms this timer; if the drawer unmounts
// before it fires — closed by its own trigger, or the whole overlay removed
// some other way — nothing would otherwise clear it.
onBeforeUnmount(() => {
	clearTimeout(springBackTimer);
});

const panelClasses = computed(() =>
	cn(
		"ft-drawer-panel bg-popover text-popover-foreground fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col gap-3 rounded-t-[14px] border-t border-r border-l border-border pt-3.5 pr-5 pb-5 pl-5 shadow-2xl",
		releasing.value && "ft-drawer-panel--releasing",
		props.class
	)
);
</script>

<template>
	<!--
		The mounted gate is OUTERMOST and the portal sits INSIDE it: the teleport
		resolves its target during the patch that creates its children, before any
		post-flush watcher or mounted hook, so the panel is always connected to the
		document by the time the focus trap calls `.focus()` on it. The source
		needed a declaration-order ceremony between two actions on this one element
		to guarantee the same thing; here it is structural. A closed drawer emits
		no scrim and no panel at all, on the server included — and `portalReady`
		(see the script) withholds the portal until mount, so an OPEN drawer
		emits nothing server-side either, rather than anchors the hydration pass
		cannot match.

		The scrim and the panel are two nodes on ONE presence clock, so they leave
		together and the unmount is a tie rather than a straggler.

		`data-state` is an ordinary binding carrying the surface vocabulary's TWO
		values — never "opening" (convention C-5). `inert` is not written by hand
		either: the presence clock sets the attribute on every registered node for
		the whole exit, which is exactly what a closing modal wants.

		The inline transform still carries the live drag offset, and the two never
		fight: a running animation wins over an inline style, so the transition
		owns `transform` for the whole exit and hands back to the inline value only
		once it is finished — by which point the panel is gone.
	-->
	<template v-if="presence.mounted && portalReady">
		<Portal>
			<div
				:ref="scrimRef"
				class="ft-drawer-scrim fixed inset-0 z-50 bg-black/60"
				aria-hidden="true"
			></div>
			<div
				:ref="panelRef"
				:class="panelClasses"
				role="dialog"
				aria-modal="true"
				:aria-labelledby="titleId"
				:aria-label="titleId ? undefined : props.ariaLabel"
				:aria-describedby="descriptionId"
				:data-state="presence.surfaceState"
				:style="{ transform: `translateY(${dragY}px)` }"
			>
				<div
					class="ft-drawer-drag-surface flex flex-col items-center gap-2 pb-1"
					@pointerdown="handlePointerDown"
					@pointermove="handlePointerMove"
					@pointerup="handlePointerUp"
					@pointercancel="handlePointerCancel"
				>
					<span class="ft-drawer-handle" aria-hidden="true"></span>
					<h2 v-if="props.title" :id="titleId" class="w-full text-[14px] font-semibold">
						{{ props.title }}
					</h2>
					<p
						v-if="props.description"
						:id="descriptionId"
						class="text-muted-foreground w-full text-[12px] leading-relaxed"
					>
						{{ props.description }}
					</p>
				</div>
				<button
					v-if="props.dismissible"
					type="button"
					class="ft-drawer-close text-muted-foreground hover:text-foreground absolute top-3.5 right-5 cursor-pointer text-[13px] leading-none"
					aria-label="Close"
					@click="close"
				>
					✕
				</button>
				<div class="ft-drawer-body flex flex-1 flex-col gap-3 overflow-y-auto">
					<slot />
				</div>
				<div v-if="$slots.footer" class="ft-drawer-footer flex justify-end gap-2">
					<slot name="footer" />
				</div>
			</div>
		</Portal>
	</template>
</template>

<style scoped>
/*
 * The entrance and its resting rule used to live here as keyframes; both
 * are now the JS transition in the script above, which emits no
 * transform at rest and collapses to zero duration under reduced motion.
 * What survives is the spring-back, which is a different interaction on
 * a different curve.
 */
@media (prefers-reduced-motion: no-preference) {
	/*
	 * The only place a CSS transition ever touches `transform`: a
	 * released drag that fell short of the dismiss threshold. Live
	 * dragging itself never carries this class, so the panel tracks the
	 * pointer with no lag; only the snap-back afterwards eases. A drag
	 * released PAST the threshold never carries it either — that one is
	 * handed to the exit transition instead, from wherever the finger
	 * let go.
	 */
	.ft-drawer-panel--releasing {
		transition: transform 0.2s cubic-bezier(0.32, 0.72, 0, 1);
	}
}

.ft-drawer-drag-surface {
	/*
	 * Without this, a touch drag starting on the handle is first
	 * interpreted by the browser as a page-scroll/pan gesture: it both
	 * withholds the continuous pointermove stream our handler needs and
	 * fights our transform with the browser's own scroll offset.
	 * Pointer capture alone does not stop that tug-of-war — only
	 * touch-action does.
	 */
	touch-action: none;
	cursor: grab;
}

.ft-drawer-handle {
	width: 40px;
	height: 4px;
	border-radius: 2px;
	background-color: var(--color-border, rgba(255, 255, 255, 0.2));
}
</style>
