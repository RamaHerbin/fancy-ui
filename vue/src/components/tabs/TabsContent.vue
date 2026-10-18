<script lang="ts">
import type { HTMLAttributes } from "vue";

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
	/** Additional CSS classes. */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, useTemplateRef } from "vue";
import { cn } from "../../utils.js";
import { preset } from "../../internals/motion/transitions.js";
import { prefersReducedMotion } from "../../internals/motion/anchored.js";
import { DURATIONS } from "../../internals/motion/tokens.js";
import { runTransition, type TransitionRun } from "../../internals/motion/animate.js";
import { TABS_KEY } from "./types.js";

defineOptions({ name: "TabsContent", inheritAttrs: false });

const { value, forceMount = false, class: className } = defineProps<TabsContentProps>();

defineSlots<{ default?(): unknown }>();

const el = useTemplateRef<HTMLDivElement>("el");
defineExpose({ ref: el });

// Undefined outside a Tabs root: nothing is ever "selected", so this
// panel only renders when `forceMount` is set, matching the graceful
// degradation every other compound piece in this library falls back to.
const context = TABS_KEY.useOptional();
const isSelected = computed(() => context?.isSelected(value) ?? false);
const rendered = computed(() => isSelected.value || forceMount);

// An ENTRANCE, never a cross-fade, and an enter-only leg rather than a
// two-way transition.
//
// TabsContent instances are siblings the caller places by hand: there is
// no shared container to stack an outgoing panel inside, and each panel
// owns its own `v-if` below. A true cross-fade would need the outgoing
// panel taken out of flow inside a containing block this component does
// not own and cannot create without wrapping every caller's content in a
// layer element — a permanent structural change to every panel in the
// library, for one 150ms dissolve. So the panel being left cuts away
// exactly as it always did, and only the arriving one is animated: the
// hard cut is the defect that was actually visible.
//
// Because the entrance never delays an unmount — the leave hook below
// removes the node in the same tick — nothing that observes the swap
// changes, and no assertion in the suite had to be rewritten for this.
//
// It plays on a real selection change only, not on first render: a
// `<Transition>` without `appear` runs no enter leg for the node it mounts
// with, so a panel that starts selected simply appears. With `forceMount`
// every panel is mounted permanently and the entrance never plays at all
// after that first render — correct, since `forceMount` exists precisely to
// keep panels alive and there is no way to animate a `hidden` attribute
// flip.
//
// `prefersReducedMotion()` is called from the enter hook rather than stored
// here: the preference is read at the instant the transition starts, never
// at construction and never during SSR. `duration: 0` makes `runTransition`
// finish synchronously and never touch `element.animate()`.
const panelFade = preset("fade");

let run: TransitionRun | undefined;

function handleEnter(element: Element, done: () => void): void {
	run?.abort();
	run = runTransition(
		element,
		panelFade(
			element,
			{ duration: prefersReducedMotion() ? 0 : DURATIONS.fast },
			{
				direction: "in",
			}
		),
		1,
		undefined,
		() => {
			// On enter finish, abort: that drops the `fill: forwards` so the
			// panel falls back to its resting style instead of carrying a
			// finished animation — whose output outranks author CSS — for the
			// rest of its life.
			run?.abort();
			run = undefined;
			done();
		}
	);
}

// Removal is synchronous: `done()` is called in the same tick, so the panel
// being left is out of the DOM exactly as it was before the entrance
// existed. A leg still in flight is cancelled rather than left running
// against a detached node.
function handleLeave(_element: Element, done: () => void): void {
	run?.abort();
	run = undefined;
	done();
}

onBeforeUnmount(() => {
	run?.abort();
	run = undefined;
});
</script>

<template>
	<Transition :css="false" @enter="handleEnter" @leave="handleLeave">
		<div
			v-if="rendered"
			ref="el"
			:id="context?.panelId(value)"
			role="tabpanel"
			:aria-labelledby="context?.triggerId(value)"
			tabindex="0"
			:hidden="!isSelected"
			:class="cn('ft-tabs-content', className)"
		>
			<slot />
		</div>
	</Transition>
</template>
