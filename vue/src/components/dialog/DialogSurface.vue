<script setup lang="ts">
import { shallowRef } from "vue";

import { cn } from "../../utils.js";
import Portal from "../../internals/Portal.vue";
import { composeRefs } from "../../internals/dom/compose-refs.js";
import { useDismissable } from "../../internals/use-dismissable.js";
import { useFocusTrap } from "../../internals/use-focus-trap.js";
import { useScrollLock } from "../../internals/use-scroll-lock.js";
import { anchored } from "../../internals/motion/anchored.js";
import { usePresence } from "../../internals/motion/presence.js";
import { DURATIONS } from "../../internals/motion/tokens.js";
import type { DialogSurfaceProps } from "./types.js";

defineOptions({ name: "DialogSurface", inheritAttrs: false });

const props = withDefaults(defineProps<DialogSurfaceProps>(), { initialFocus: null });

defineSlots<{
	/** The panel's content. */
	default?: () => unknown;
}>();

// A plain sink rather than `useTemplateRef`: the element arrives through the
// composed function ref below, and a `useTemplateRef` handle is read-only in a
// development build, so writing the node into it would warn on every attach.
// The panel is created by `presence.mounted`, so this is `null` in `setup` and
// every consumer of it is a post-flush watcher (convention C-1).
const panel = shallowRef<HTMLDivElement | null>(null);

// Convention C-4: exactly where the source declares its bindable `ref`.
defineExpose({ ref: panel });

// Returns the two functions the source action hands out through `onActivate`:
// the eager return, and the re-arm. Its identity is stable from `setup`, so
// the two hooks below can call it before the trap has attached.
const trap = useFocusTrap(panel, () => ({
	initialFocus: props.initialFocus,
	fallbackFocus: props.fallbackFocus,
}));

const presence = usePresence(() => props.open, {
	// The two halves of the focus handshake, at the two moments the source
	// puts them: intro start → rearm, outro start → returnFocusNow.
	//
	// `returnFocusNow` at the dismiss instant is the whole point: waiting for
	// the trap's own `destroy()` would leave a keyboard user on `<body>` for
	// the length of the fade, because the panel is marked `inert` the instant
	// the exit starts.
	//
	// `rearm` is the other half. A dialog reopened DURING its exit reverses
	// instead of remounting, so the trap is never re-created: without this the
	// panel would come back `aria-modal` and interactive with focus left on
	// the trigger behind it, Tab walking the page rather than the panel, and
	// the eager return already spent for the life of the instance.
	onEnterStart: () => trap.rearm(),
	onExitStart: () => trap.returnFocusNow(),
});

// LAW: release at exit END, never at exit start. `presence.mounted` stays true
// through the whole fade, so the release lands in the same teardown the
// source's outro-delayed `destroy()` landed in — the page stays locked until
// the backdrop is actually gone instead of unlocking the instant `open` flips
// and leaving the page scrollable under a scrim still on screen. NEVER
// `() => props.open`.
useScrollLock(() => presence.mounted);

// `active` stays a GETTER (convention C-2): the layer must stop being TOP of
// the stack the instant `open` flips, while remaining ON the stack for the
// whole exit, so a second Escape during the fade falls through to whatever is
// underneath instead of being swallowed.
useDismissable(panel, () => ({
	onDismiss: props.onDismiss,
	escape: props.escape,
	outsideClick: props.outsideClick,
	exclude: props.exclude,
	active: () => props.open,
}));

// Built ONCE in `setup`: the identity must not change between patches, or Vue
// detaches and reattaches the node and throws the in-flight leg away. The panel
// needs both the element sink above and the presence leg.
//
// ONE bidirectional leg per node, never a split enter/exit pair: a reopen
// mid-exit resumes from the position the close actually reached instead of
// snapping to invisible first. The params factory is called with `entering` at
// the instant each leg starts — a single two-way transition cannot tell the two
// directions apart on its own, and `open` can.
const panelRef = composeRefs<HTMLDivElement>(
	panel,
	presence.register("panel", anchored, (entering) => ({
		entering,
		duration: DURATIONS.base,
		exitDuration: DURATIONS.exit,
	}))
);

// The scrim fades on opacity alone (`scale: false`) — a full-viewport fixed
// element has no business acquiring a compositing layer for a transform it does
// not use. It shares the panel's clock exactly (one presence, two keys), so the
// two leave together and the "unmount the subtree when the LAST transition
// finishes" rule is a tie rather than a straggler.
const scrimRef = composeRefs<HTMLDivElement>(
	presence.register("scrim", anchored, (entering) => ({
		entering,
		scale: false,
		duration: DURATIONS.base,
		exitDuration: DURATIONS.exit,
	}))
);
</script>

<template>
	<!--
		The mounted gate is OUTERMOST and the portal sits INSIDE it: the teleport
		resolves its target during the patch that creates its children, before any
		post-flush watcher or mounted hook, so the panel is always connected to the
		document by the time the focus trap calls `.focus()` on it. The source
		needed a declaration-order ceremony between two actions on this one element
		to guarantee the same thing; here it is structural. A closed surface emits
		no scrim and no panel at all, on the server included (a development server
		render still carries these comments; a production build strips them).

		`data-state` is an ordinary binding carrying the surface vocabulary's TWO
		values — never "opening" (convention C-5). `inert` is not written by hand
		either: the presence clock sets the attribute on every registered node for
		the whole exit, which is exactly what a closing modal wants.
	-->
	<template v-if="presence.mounted">
		<Portal>
			<div
				:ref="scrimRef"
				class="ft-dialog-scrim fixed inset-0 z-50 bg-black/60"
				aria-hidden="true"
			></div>
			<div
				:ref="panelRef"
				:role="props.role"
				aria-modal="true"
				:aria-labelledby="props.titleId"
				:aria-describedby="props.descriptionId"
				tabindex="-1"
				:data-state="presence.surfaceState"
				:class="
					cn(
						'ft-dialog-panel border-border bg-popover text-popover-foreground fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-3 overflow-y-auto rounded-xl border p-5 shadow-2xl',
						'focus-visible:outline-none',
						props.panelClass
					)
				"
			>
				<slot />
			</div>
		</Portal>
	</template>
</template>

<style scoped>
/*
 * The brand accent has no semantic Tailwind token, so it is a scoped
 * custom property with a light-dark() fallback — the same shape Button's
 * own `--ft-btn-accent` uses. Named for the category rather than this one
 * component: every overlay in this wave (Dialog, AlertDialog, Popover,
 * Tooltip, ...) reads the same `--ft-overlay-accent`, so retinting one
 * `--ft-accent` up the tree moves every overlay's focus ring together.
 * Set on the panel, not a wrapper: the custom property still inherits to
 * every descendant that reads it (Dialog's close button, for one), and
 * scoping it here means a page with no open dialog pays nothing for it.
 */
.ft-dialog-panel {
	--ft-overlay-accent: var(
		--ft-accent,
		light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
	);
}

/*
 * No `@keyframes` and no `@media (prefers-reduced-motion)` block here any
 * more: both surfaces are driven by the shared JS transition above, which
 * collapses its own duration to 0 when the user has asked for reduced
 * motion — the sampler then skips `element.animate()` entirely and the dialog
 * appears and disappears instantly, with the close staying synchronous.
 *
 * The keyframes this replaced also carried a bug worth naming: the panel's
 * `from` restated `translate(-50%, -50%)` as a `transform`, on a node
 * whose centring comes from Tailwind v4's separate `translate` property.
 * The two composed, so the panel drifted in from half its own size up and
 * to the left. `transform: scale(…)` alone composes after `translate` and
 * scales the panel about its own centre without touching the centring.
 */
</style>
