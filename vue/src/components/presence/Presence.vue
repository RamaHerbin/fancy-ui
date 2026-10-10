<script lang="ts">
import type { HTMLAttributes } from "vue";

import type { PresetName } from "../../internals/motion/types.js";

/**
 * Presence — mounts and unmounts content with a real entrance and exit rather
 * than an instant swap, driving `data-state` through `opening → open →
 * closing` and firing lifecycle callbacks a caller can hook into. Shares
 * Reveal's preset vocabulary, plus `blur`/`zoom` — the one place besides
 * Reveal a preset may carry `filter`, and here it is opt-in per instance
 * rather than per child — with an asymmetric, faster-leaving exit by default.
 *
 * There is deliberately no `<style>` block: the source has none, and no custom
 * properties either, because the motion is entirely JS-timed through
 * `duration`/`exitDuration`/`delay`/`distance` feeding `preset()`'s sampled
 * keyframes. There is nothing for a stylesheet to override; use the props.
 */
export interface PresenceProps {
	/** Whether the content is mounted and, once the entrance settles, visible. */
	open: boolean;
	/** Shares Reveal's preset vocabulary, plus `blur`/`zoom` — the one place besides Reveal a preset may carry `filter`, and here it's opt-in per instance, not per child. */
	preset?: PresetName;
	/** Entrance duration in ms. */
	duration?: number;
	/** Exit duration in ms — shorter than the entrance by default; leaving reads faster than arriving. */
	exitDuration?: number;
	/** Delay in ms before the entrance starts. Applied to the exit too. */
	delay?: number;
	/** Entrance travel distance in px for the four directional presets. The exit travels half as far. */
	distance?: number;
	/** Whether the panel is `inert` while closing. `true`, the default, reproduces the native behaviour the source framework applies to any transitioning element; `false` is an explicit opt-out, and it means the attribute is never touched at all. */
	inert?: boolean;
	/** Fires once the entrance transition settles. */
	onEnterEnd?: () => void;
	/** Fires once the exit transition settles — NOT guaranteed if the component is unmounted mid-exit; see the README. */
	onExitEnd?: () => void;
	/** Additional CSS classes, merged onto the root. */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { shallowRef, useAttrs } from "vue";

import { cn } from "../../utils.js";
import { composeRefs } from "../../internals/dom/compose-refs.js";
import { usePresence } from "../../internals/motion/presence.js";
import { useReducedMotion } from "../../internals/motion/use-media-query.js";
import {
	preset as makePreset,
	type PresetParams,
	type TransitionDirection,
	type TransitionSpec,
} from "../../internals/motion/transitions.js";

defineOptions({ name: "Presence", inheritAttrs: false });

const props = withDefaults(defineProps<PresenceProps>(), {
	preset: "fade",
	duration: 300, // DURATIONS.base
	exitDuration: 200, // DURATIONS.exit
	delay: 0,
	distance: 16,
	inert: true,
});

defineSlots<{
	/** Panel content. */
	default(): unknown;
}>();

const attrs = useAttrs();

// A plain sink rather than `useTemplateRef`: the element arrives through the
// composed function ref below, and a `useTemplateRef` handle is read-only in a
// development build, so writing the node into it would warn on every attach.
const root = shallowRef<HTMLDivElement | null>(null);
defineExpose({ ref: root });

const reduced = useReducedMotion();

const presence = usePresence(() => props.open, {
	// A getter, not a captured boolean: the opt-out is read at the instant the
	// exit starts, which is where the source reads it too.
	get inert() {
		return props.inert;
	},
	onEnterEnd: () => props.onEnterEnd?.(),
	onExitEnd: () => props.onExitEnd?.(),
});

/**
 * The ONE transition behind Presence's single leg — never a split enter/exit
 * pair, because reversal smoothing (a rapid `open` toggle resuming from the
 * position the close actually reached, rather than snapping to the far end)
 * only exists for a unified bidirectional leg.
 *
 * `preset` is resolved HERE, at the instant a leg starts, not once in `setup`:
 * the source builds its spec inside the transition function, so a `preset`
 * changed after mount takes effect on the next leg.
 */
function presenceTransition(
	node: Element,
	params?: PresetParams,
	options?: { direction: TransitionDirection }
): TransitionSpec {
	return makePreset(props.preset)(node, params, options);
}

// Built ONCE in `setup`: its identity must not change between patches, or Vue
// detaches and reattaches the node and throws the in-flight leg away.
//
// The params factory supplies the direction the leg itself cannot know (a
// single two-way transition reports an ambiguous "both" on both of its
// invocations, while `open` is the real signal), and it is called at the
// instant a leg starts, so it always reads the latest props and reduced-motion
// answer rather than the ones registered at mount.
const rootRef = composeRefs<HTMLDivElement>(
	root,
	presence.register(presenceTransition, (entering) => ({
		duration: reduced.value ? 0 : entering ? props.duration : props.exitDuration,
		delay: reduced.value ? 0 : props.delay,
		distance: entering ? props.distance : props.distance / 2,
	}))
);
</script>

<template>
	<div
		v-if="presence.mounted"
		:ref="rootRef"
		v-bind="attrs"
		:class="cn('ft-presence', props.class)"
		:data-state="presence.state"
	>
		<slot />
	</div>
</template>
