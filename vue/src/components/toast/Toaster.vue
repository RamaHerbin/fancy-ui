<script lang="ts">
import type { HTMLAttributes } from "vue";

export type ToasterPosition =
	| "top-left"
	| "top-center"
	| "top-right"
	| "bottom-left"
	| "bottom-center"
	| "bottom-right";

export interface ToasterProps {
	/** Corner (or edge-center) the stack anchors to. Defaults to `"bottom-right"`. */
	position?: ToasterPosition;
	/** Additional classes for the viewport that stacks the toasts. */
	class?: HTMLAttributes["class"];
	/**
	 * Plays the `success`/`error` cue through the sound controller when a
	 * toast of that variant appears. Off by default; only audible once the
	 * user has enabled sound.
	 */
	sound?: boolean;
}

// Ids already sounded, kept at *module* scope — unlike `announcedIds`
// below, which is per-instance and thrown away the moment a `<Toaster>`
// unmounts, while `toastStore.items` (a module-level singleton) survives
// that unmount untouched. Without this, a remount while a success/error
// toast is still on screen replays its cue: the announce effect reruns on
// the fresh instance with an empty `announcedIds`, so a toast that has
// already sounded once looks unseen to the sound check too. The live
// region legitimately wants a fresh instance to re-announce (a screen
// reader is not attached to the old, destroyed region), so this is
// checked separately rather than folded into `announcedIds`. Pruned to
// the current stack on every effect run, same bounding `announcedIds`
// already does, so this never grows for the life of the page — ids are
// monotonic and never reused (see `store.ts`'s `toast()`).
const soundedIds = new Set<string>();

const POSITION_CLASSES: Record<ToasterPosition, string> = {
	"top-left": "top-4 left-4 items-start",
	"top-center": "top-4 left-1/2 -translate-x-1/2 items-center",
	"top-right": "top-4 right-4 items-end",
	"bottom-left": "bottom-4 left-4 items-start",
	"bottom-center": "bottom-4 left-1/2 -translate-x-1/2 items-center",
	"bottom-right": "bottom-4 right-4 items-end",
};
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import Portal from "../../internals/Portal.vue";
import { prefersReducedMotion } from "../../internals/motion/anchored.js";
import { DURATIONS, JS_EASINGS } from "../../internals/motion/tokens.js";
import { preset } from "../../internals/motion/transitions.js";
import { runTransition, type TransitionRun } from "../../internals/motion/animate.js";
import { sound as soundFx } from "../../sound/sound.js";
import { toastStore, clearAllToastTimers, rearmToastTimers } from "./store.js";
import type { ToastItem } from "./store.js";
import Toast from "./Toast.vue";

/**
 * The viewport: portals to `<body>`, renders the store's stack in order, and
 * owns the two live regions plus the timer hand-off protocol (`rearm` on
 * mount, `clear` on unmount).
 */
defineOptions({ name: "Toaster", inheritAttrs: false });

const { position = "bottom-right", class: className, sound = false } = defineProps<ToasterProps>();

const el = useTemplateRef<HTMLDivElement>("el");
defineExpose({ ref: el });

const items = computed(() => toastStore.items);

// Two regions, mounted empty and never re-created — only their *content*
// changes. A live region created at the moment of the announcement is not
// reliably picked up by screen readers; existing from mount and being
// updated in place is what makes the announcement land. Two of them, not
// one, because politeness is fixed per region: `polite` must never be
// upgraded to `assertive` (or the reverse) by mutating the same element's
// aria-live attribute, which most screen readers do not pick up reliably
// after the region already exists.
const politeAnnouncement = ref("");
const assertiveAnnouncement = ref("");

// Ids already announced, refreshed to exactly the current stack on every
// run — bounded to "currently visible", rather than growing forever for
// the life of the page.
let announcedIds = new Set<string>();

function announcementText(item: ToastItem): string {
	return item.description ? `${item.title}. ${item.description}` : item.title;
}

function syncAnnouncements() {
	const current = toastStore.items;

	// Forget any sounded id that has left the stack (dismissed, auto-
	// dismissed, or evicted past `MAX_VISIBLE`) — bounds `soundedIds` to
	// "currently visible", same as `announcedIds` below, instead of
	// growing forever for the life of the page.
	const currentIds = new Set(current.map((item) => item.id));
	for (const id of soundedIds) {
		if (!currentIds.has(id)) soundedIds.delete(id);
	}

	for (const item of current) {
		// Only success/error toasts get a cue — info and loading stay silent.
		// `sound` lives on `<Toaster>`, never on `toast()`'s own options: the
		// caller who raises the toast has no per-call say over whether it
		// plays. Gated on the module-level `soundedIds`, not the
		// per-instance `announcedIds`, so a remount can't replay a cue for a
		// toast that already got one.
		// The ID is recorded whether or not sound is currently opted in:
		// the cue marks a toast APPEARING, so flipping `sound` on later
		// must not retroactively replay outcomes already on screen.
		if (item.variant === "success" || item.variant === "error") {
			if (sound && !soundedIds.has(item.id)) {
				soundFx.play(item.variant);
			}
			soundedIds.add(item.id);
		}
		if (announcedIds.has(item.id)) continue;
		if (item.variant === "error") {
			assertiveAnnouncement.value = announcementText(item);
		} else {
			politeAnnouncement.value = announcementText(item);
		}
	}
	announcedIds = new Set(current.map((item) => item.id));
}

// The source's `$effect` in two halves, because a `watch` without `immediate`
// never runs on the server and never runs on mount either: the mount call
// below is the first run the effect would have had (a toast raised before any
// viewport existed still announces), and the watcher is every run after it.
// `flush: "post"`, so a run always sees the DOM it describes. `sound` is a
// source of its own for the same reason the source's effect read it: a
// consumer can flip it mid-session, and the id bookkeeping above is what keeps
// that from replaying outcomes already on screen.
watch([() => toastStore.items, () => sound], syncAnnouncements, { flush: "post" });

onMounted(() => {
	syncAnnouncements();

	// The other half of `onBeforeUnmount` below: a toast that was already
	// ticking down when the *previous* `<Toaster>` unmounted has a real
	// deadline but no live timer counting toward it (that timer was cleared,
	// deliberately — see `clearAllToastTimers`). Re-arming on mount is what
	// stops such a toast from being stuck on screen forever with nothing left
	// to dismiss it — `onMounted` rather than a bare call in `setup` so this
	// only ever runs in the browser, never during SSR.
	rearmToastTimers();
});

// Stops the live timers, not the toasts or their deadlines — see
// `clearAllToastTimers`'s own doc comment for why unmounting isn't
// treated as pausing.
onBeforeUnmount(() => {
	clearAllToastTimers();
});

// Entrance and exit are two SEPARATE param sets fed to ONE `preset("fade-up")`
// leg per toast, resolved by direction at the instant the leg starts, never
// one bidirectional transition. The list is keyed by toast id, which is the
// whole reason a dismissed toast can animate out at all: its row is held in
// the DOM by the leave leg below for its last 200ms rather than removed with
// the store entry. A single bidirectional transition would have no local "am I
// entering?" flag to disambiguate with — a toast has no `open` boolean, its
// existence IS its open state. Splitting the two is also what lets the exit be
// its own, shorter, shallower gesture rather than the entrance played
// backwards — see the two params objects below.
//
// The one thing the split costs is reversal smoothing — a toast interrupted
// mid-exit restarts instead of reversing — and that costs nothing in practice:
// `toast()` never reuses an id, so the store can never re-add a toast that is
// currently leaving. That is also why neither leg passes a counterpart. Do not
// "simplify" this back into one two-way transition.
const slide = preset("fade-up");

// Every leg currently in flight, so an unmount mid-transition leaves no
// animation running on a detached node.
const runs = new Set<TransitionRun>();

/** The `<Toast>` panel inside a row wrapper — the node the source carried its
 *  `in:`/`out:` directives on, and the node whose resting styles the sampled
 *  keyframes have to return to. */
function panelOf(element: Element): Element {
	return element.firstElementChild ?? element;
}

function onToastEnter(element: Element, done: () => void) {
	const panel = panelOf(element);
	const spec = slide(
		panel,
		{
			duration: prefersReducedMotion() ? 0 : DURATIONS.base,
			distance: 8,
			easing: JS_EASINGS.out,
		},
		{ direction: "in" }
	);
	// `let`, not `const`: on the reduced-motion path the finish callback fires
	// synchronously from inside runTransition, before the binding is assigned.
	let run: TransitionRun | undefined;
	let settled = false;
	run = runTransition(panel, spec, 1, undefined, () => {
		settled = true;
		if (run) runs.delete(run);
		// Aborting on ENTER finish drops the `fill: forwards` so the panel
		// falls back to its resting style — which *is* the visible end state
		// by construction. The exit below deliberately does NOT abort: its
		// node stays in the DOM until the leave callback removes it, and
		// dropping fill-forwards would flash the toast back for a frame.
		run?.abort();
		done();
	});
	if (!settled) runs.add(run);
}

function onToastLeave(element: Element, done: () => void) {
	const panel = panelOf(element);
	// Set synchronously, immediately before the exit starts. A leaving toast
	// must not be reachable: its close and action buttons are still in the DOM
	// for another 200ms, and clicking or tabbing into one of them would act on
	// a toast the user already dismissed.
	panel.toggleAttribute("inert", true);
	const spec = slide(
		panel,
		{
			duration: prefersReducedMotion() ? 0 : DURATIONS.exit,
			distance: 4,
			easing: JS_EASINGS.in,
		},
		{ direction: "out" }
	);
	let run: TransitionRun | undefined;
	let settled = false;
	run = runTransition(panel, spec, 0, undefined, () => {
		settled = true;
		if (run) runs.delete(run);
		done();
	});
	if (!settled) runs.add(run);
}

onBeforeUnmount(() => {
	for (const run of runs) run.abort();
	runs.clear();
});

const classes = computed(() => cn("ft-toaster contents", className));

const viewportClasses = computed(() =>
	cn(
		"ft-toaster-viewport pointer-events-none fixed z-50 flex flex-col gap-2",
		POSITION_CLASSES[position]
	)
);
</script>

<template>
	<Portal>
		<div ref="el" :class="classes">
			<div aria-live="polite" aria-atomic="true" class="sr-only">{{ politeAnnouncement }}</div>
			<div aria-live="assertive" aria-atomic="true" class="sr-only">
				{{ assertiveAnnouncement }}
			</div>

			<div :class="viewportClasses">
				<TransitionGroup :css="false" @enter="onToastEnter" @leave="onToastLeave">
					<div v-for="item in items" :key="item.id" class="pointer-events-auto">
						<Toast :item="item" />
					</div>
				</TransitionGroup>
			</div>
		</div>
	</Portal>
</template>
