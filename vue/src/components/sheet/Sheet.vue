<script lang="ts">
import type { HTMLAttributes } from "vue";

export type SheetSide = "left" | "right" | "top" | "bottom";
export type SheetSize = "sm" | "md" | "lg";

export interface SheetProps {
	/** Whether the sheet is open. Two-way through `v-model:open`. */
	open?: boolean;
	/** Called with the new value whenever the sheet opens or closes. */
	onOpenChange?: (open: boolean) => void;
	/** Edge of the viewport the panel slides in from. */
	side?: SheetSide;
	/** Heading rendered in the header and wired to `aria-labelledby`. */
	title?: string;
	/** Supporting text under the title, wired to `aria-describedby`. */
	description?: string;
	/**
	 * Accessible name for the dialog when no `title` is rendered (e.g. a
	 * custom header). Ignored when `title` is set, since `aria-labelledby`
	 * already supplies the name.
	 */
	ariaLabel?: string;
	/** Whether Escape, the scrim and the close button can close the sheet. */
	dismissible?: boolean;
	/** Panel width (left/right sides) or height (top/bottom sides). */
	size?: SheetSize;
	/** Additional CSS classes merged onto the panel. */
	class?: HTMLAttributes["class"];
	/**
	 * Plays the `close` cue through the sound controller when the sheet is
	 * dismissed. Off by default; only audible once the user has enabled
	 * sound.
	 */
	sound?: boolean;
}
</script>

<script setup lang="ts">
import { computed, shallowRef } from "vue";

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

defineOptions({ name: "Sheet", inheritAttrs: false });

const {
	onOpenChange,
	side = "right",
	title,
	description,
	ariaLabel,
	dismissible = true,
	size = "md",
	class: className,
	sound = false,
} = defineProps<SheetProps>();

// The counterpart of the source's `open = $bindable(false)`: writable from
// inside, kept in step with a caller driving it from outside, and free to move
// on its own when nobody is listening. That is what makes both documented call
// shapes work off one implementation — a caller two-way binding `open`, and a
// caller who passes only `open` plus `onOpenChange`.
const open = defineModel<boolean>("open", { default: false });

defineSlots<{
	/** Panel body content. */
	default?: () => unknown;
	/** Content pinned below the body, e.g. actions. */
	footer?: () => unknown;
}>();

// One seed per instance, suffixed for title/description — the same approach
// the source settled on with `$props.id()`, and SSR-stable for the same
// reason: this can render on the server the moment a caller flips `open` true
// during SSR.
const uid = useFancyId();
const titleId = computed(() => (title ? `${uid}-title` : undefined));
const descriptionId = computed(() => (description ? `${uid}-description` : undefined));

// A no-op while `sound` is false, so the call site below stays unguarded, and
// the preference is read inside the returned function rather than in a render
// path.
const playCue = useSoundCue(() => sound);

function close() {
	// The same guard keeps the cue honest: every dismissal — Escape, the
	// scrim, the close button — funnels through here, while a caller writing
	// `open` to false never does, and a second Escape landing during the exit
	// is already gone by the time it arrives.
	if (!open.value) return;
	open.value = false;
	playCue("close");
	onOpenChange?.(false);
}

// A plain sink rather than `useTemplateRef`: the element arrives through the
// composed function ref below, and a `useTemplateRef` handle is read-only in a
// development build. The panel is created by `presence.mounted`, so this is
// `null` in `setup` and every consumer of it is a post-flush watcher.
const panel = shallowRef<HTMLDivElement | null>(null);

// Exactly where the source declares its bindable `ref`. `ref` is a reserved
// vnode key here, so it is published on the instance instead of as a prop.
defineExpose({ ref: panel });

// Returns the two functions the source action hands out through `onActivate`:
// the eager return, and the re-arm. Its identity is stable from `setup`, so
// the two presence hooks below can close over it before the trap has attached.
const trap = useFocusTrap(panel);

const presence = usePresence(() => open.value, {
	// The two halves of the focus handshake, at the two moments the source
	// puts them: `onintrostart` → rearm, `onoutrostart` → returnFocusNow.
	//
	// `returnFocusNow` at the dismiss instant is the whole point: it is called
	// on EVERY close path (Escape, the scrim, the close button, a caller's own
	// `open` write). Waiting for the trap's own destroy would leave a keyboard
	// user on `<body>` for the whole length of the slide-out, because the
	// closing panel is made inert the instant the exit starts.
	//
	// `rearm` is the other half. A sheet reopened DURING its exit reverses
	// instead of remounting, so the trap is never re-created: without this the
	// panel would come back `aria-modal` and interactive with focus left on
	// the trigger behind it, and the eager return already spent for the life
	// of the instance.
	onEnterStart: () => trap.rearm(),
	onExitStart: () => trap.returnFocusNow(),
});

// Release at exit END, never at exit start. `presence.mounted` stays true
// through the whole slide-out, so the release lands in the same teardown the
// source's outro-delayed `destroy()` landed in — the page stays locked until
// the panel is actually gone instead of unlocking the instant `open` flips and
// leaving the page scrollable under a scrim still on screen.
useScrollLock(() => presence.mounted);

// `active` stays a GETTER: the layer must stop being TOP of the stack the
// instant `open` flips, while remaining ON the stack for the whole exit, so a
// second Escape during the slide-out falls through to whatever is underneath
// instead of being swallowed.
useDismissable(panel, () => ({
	onDismiss: close,
	escape: dismissible,
	outsideClick: dismissible,
	active: () => open.value,
}));

// The one place this component owns motion. Not `anchored`: that helper is
// scale+opacity by design and deliberately carries no translate term, and a
// sheet's whole gesture is travel. Not a pixel-distance preset either — a
// sheet has to clear its own edge whatever its size, which only `%` expresses.
//
// The exit does NOT halve its travel the way the scale rung does. A sheet that
// slid half-way off the viewport and then vanished would read worse than one
// that simply leaves; it is a named exception to the half-delta exit rule
// rather than an oversight.
function edgeSlide(
	_node: Element,
	params?: { side: SheetSide; entering: boolean }
): TransitionSpec {
	const reduced = prefersReducedMotion();
	const entering = params?.entering ?? false;
	const resolvedSide = params?.side ?? "right";
	const axis = resolvedSide === "left" || resolvedSide === "right" ? "X" : "Y";
	const sign = resolvedSide === "left" || resolvedSide === "top" ? -1 : 1;
	return {
		delay: 0,
		// Reduced motion collapses this to 0, which makes the sampler finish
		// synchronously and never touch `element.animate()` — so the close is
		// exactly as synchronous as it was before the sheet animated out at
		// all.
		duration: reduced ? 0 : entering ? DURATIONS.base : DURATIONS.exit,
		easing: entering ? JS_EASINGS.out : JS_EASINGS.in,
		// `u = 1 - t`: fully out at t=0, resting at t=1. No opacity term — a
		// sheet leaves by travelling, and fading it as well reads as two
		// gestures fighting.
		css: (_t, u) => `transform: translate${axis}(${sign * 100 * u}%)`,
	};
}

// Built ONCE in `setup`: the identity must not change between patches, or Vue
// detaches and reattaches the node and throws the in-flight leg away. The panel
// needs both the element sink above and the presence leg.
//
// ONE bidirectional leg per node, never a split enter/exit pair: a reopen
// mid-exit resumes from the position the close actually reached instead of
// snapping off-screen first. `side` rides in through the params factory, read
// at the instant each leg starts.
const panelRef = composeRefs<HTMLDivElement>(
	panel,
	presence.register("panel", edgeSlide, (entering) => ({ side, entering }))
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

const isHorizontal = computed(() => side === "left" || side === "right");
const dimensionClasses = computed(() =>
	isHorizontal.value ? WIDTH_CLASSES[size] : HEIGHT_CLASSES[size]
);

const panelClasses = computed(() =>
	cn(
		"ft-sheet-panel bg-popover text-popover-foreground fixed z-50 flex flex-col gap-4 p-4 shadow-2xl",
		POSITION_CLASSES[side],
		dimensionClasses.value,
		className
	)
);
</script>

<template>
	<!--
		The mounted gate is OUTERMOST and the portal sits INSIDE it: the teleport
		resolves its target during the patch that creates its children, before any
		post-flush watcher or mounted hook, so the panel is always connected to the
		document by the time the focus trap calls `.focus()` on it. The source
		needed a declaration-order ceremony — `use:portal` written ahead of
		`use:focusTrap`, and each top-level node portalled independently rather
		than sharing one wrapper — to guarantee the same thing; here it is
		structural, and a `<Teleport>` adds no wrapper element of its own, so the
		two surfaces still arrive in `document.body` as siblings. A closed surface
		emits nothing at all, on the server included.

		`data-state` is an ordinary binding carrying the surface vocabulary's TWO
		values — never "opening". The source had to write it imperatively from
		`onoutrostart` because its scheduler skips effects in a branch already
		marked inert; the presence clock here keeps the subtree mounted and
		reactive for the whole exit. `inert` is not written by hand either: the
		clock sets the attribute on every registered node for the length of the
		exit, which is exactly what a closing modal wants. `data-side` survives the
		deletion of the keyframes it used to select — it drives POSITION_CLASSES
		semantics for consumers, not just decoration.
	-->
	<template v-if="presence.mounted">
		<Portal>
			<div
				:ref="scrimRef"
				class="ft-sheet-scrim fixed inset-0 z-50 bg-black/60"
				aria-hidden="true"
			></div>
			<div
				:ref="panelRef"
				:class="panelClasses"
				role="dialog"
				aria-modal="true"
				:aria-labelledby="titleId"
				:aria-label="titleId ? undefined : ariaLabel"
				:aria-describedby="descriptionId"
				:data-state="presence.surfaceState"
				:data-side="side"
			>
				<div
					v-if="title || dismissible"
					class="ft-sheet-header flex items-start justify-between gap-4"
				>
					<h2 v-if="title" :id="titleId" class="text-[15px] font-semibold">{{ title }}</h2>
					<button
						v-if="dismissible"
						type="button"
						class="ft-sheet-close text-muted-foreground hover:text-foreground cursor-pointer text-[13px] leading-none"
						aria-label="Close"
						@click="close"
					>
						✕
					</button>
				</div>
				<p
					v-if="description"
					:id="descriptionId"
					class="text-muted-foreground text-[12.5px] leading-relaxed"
				>
					{{ description }}
				</p>
				<div class="ft-sheet-body flex flex-1 flex-col gap-3 overflow-y-auto">
					<slot />
				</div>
				<div v-if="$slots.footer" class="ft-sheet-footer flex justify-end gap-2">
					<slot name="footer" />
				</div>
			</div>
		</Portal>
	</template>
</template>
