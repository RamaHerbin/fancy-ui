<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { DataOrientation, Direction } from "./types.js";

/**
 * An icon dock whose items magnify smoothly as the pointer approaches.
 *
 * No `ref` prop: the source exposes no bindable ref, and no rest props either —
 * it reads only these props and spreads nothing, so `inheritAttrs` stays false
 * with no `v-bind="attrs"` anywhere.
 */
export interface DockProps {
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
	/** Maximum size increase in pixels. */
	magnification?: number;
	/** Pointer distance over which the magnification falls off. */
	distance?: number;
	/** Vertical alignment of the icons. */
	direction?: Direction;
	/** Dock orientation. */
	orientation?: DataOrientation;
}
</script>

<script setup lang="ts">
import { computed, provide, reactive } from "vue";
import { cn } from "../../utils.js";
import { useMediaQuery, useReducedMotion } from "../../internals/motion/use-media-query.js";
import { DOCK_CONTEXT_KEY, type DockContext } from "./types.js";

defineOptions({ name: "Dock", inheritAttrs: false });

const {
	class: className = "",
	magnification = 60,
	distance = 140,
	direction = "middle",
	orientation = "horizontal",
} = defineProps<DockProps>();

defineSlots<{ default?(): unknown }>();

// Use object with `current` property so children can read reactive updates
const mouseX = reactive({ current: Infinity });
const mouseY = reactive({ current: Infinity });

// The magnification is a JS-written inline `width`/`height` on each icon, so
// a CSS media query cannot stop it — the driver has to. Neither query is
// touched during setup: `useMediaQuery` answers its fallback for the server
// render and the hydration render and only reaches `window` from `onMounted`,
// where it also registers its own teardown.
const reduced = useReducedMotion();
// `any-hover`, not `hover`: the unprefixed feature describes only the
// PRIMARY pointing device, so a hybrid laptop-tablet whose primary input is
// touch answers `(hover: none)` even with a mouse plugged in — and the dock
// would then ignore every real mouse move. `any-hover: none` is true only
// when NO attached device can hover, which is the actual question here.
// Touch on such a hybrid is suppressed by `pointerType` below instead.
const coarse = useMediaQuery("(any-hover: none)");

// One flag, two reasons: a visitor who asked for less motion, and a device
// where nothing can hover at all (where the icons under a finger would
// magnify around wherever the last tap happened to land). Either way the
// icons keep their resting 40px.
const magnify = computed(() => !reduced.value && !coarse.value);

// The getter-object shape the source publishes, kept verbatim: a child's
// `computed` reading through these getters stays tracked.
const context: DockContext = {
	get mouseX() {
		return mouseX;
	},
	get mouseY() {
		return mouseY;
	},
	get magnification() {
		return magnification;
	},
	get distance() {
		return distance;
	},
	get orientation() {
		return orientation;
	},
	get magnify() {
		return magnify.value;
	},
};

provide(DOCK_CONTEXT_KEY, context);

// Pointer events, not mouse events, for one reason: `pointerType`. A tap
// synthesises a `mousemove` indistinguishable from a real one, so on a
// device that CAN hover but is currently being touched, the mouse-event
// version magnified around the last tap. Non-primary pointers are dropped
// too — a second finger has no business moving the magnifier.
function onPointerMove(e: PointerEvent) {
	if (!magnify.value) return;
	if (e.pointerType === "touch" || !e.isPrimary) return;
	// clientX/clientY, not pageX/pageY: `DockIcon` measures each icon with
	// `getBoundingClientRect()`, whose coordinates are relative to the
	// viewport. Page coordinates add the scroll offset, so on a scrolled page
	// every icon's distance would be off by exactly that offset. The Svelte
	// source reads `pageX`/`pageY` and shares the defect; fixed here as an
	// upstream fix, matching the React port.
	const { clientX, clientY } = e;
	requestAnimationFrame(() => {
		mouseX.current = clientX;
		mouseY.current = clientY;
	});
}

// Deliberately ungated, unlike `onPointerMove`: if the preference or the
// pointer type flips while a pointer is already inside the dock, the last
// tracked position would otherwise stay stuck in `mouseX`/`mouseY` forever.
// Resetting to Infinity is what returns every icon to its resting size.
function onPointerLeave() {
	requestAnimationFrame(() => {
		mouseX.current = Infinity;
		mouseY.current = Infinity;
	});
}

const directionClass = computed(() =>
	direction === "top" ? "items-start" : direction === "bottom" ? "items-end" : "items-center"
);
</script>

<template>
	<div
		:class="
			cn(
				'mx-auto flex h-[58px] w-max gap-4 rounded-2xl border p-2 backdrop-blur-md transition-all supports-backdrop-blur:bg-white/10 supports-backdrop-blur:dark:bg-black/10',
				orientation === 'vertical' && 'h-max w-[58px] flex-col',
				directionClass,
				className
			)
		"
		role="toolbar"
		tabindex="0"
		@pointermove="onPointerMove"
		@pointerleave="onPointerLeave"
	>
		<slot />
	</div>
</template>
