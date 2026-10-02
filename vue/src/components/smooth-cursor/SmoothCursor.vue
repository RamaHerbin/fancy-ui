<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { SpringConfig } from "./smooth-cursor-core.js";

export type { SpringConfig };

export interface SmoothCursorProps {
	/** Spring physics configuration */
	springConfig?: SpringConfig;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import { useReducedMotion } from "../../internals/motion/use-media-query.js";
import { createSmoothCursor, type SmoothCursorEngine } from "./smooth-cursor-core.js";

defineOptions({ name: "SmoothCursor", inheritAttrs: false });

const { springConfig = {}, class: className = "" } = defineProps<SmoothCursorProps>();

defineSlots<{
	cursor?: () => unknown;
}>();

const cursorRef = useTemplateRef<HTMLDivElement>("cursor");
const visible = ref(false);
let engine: SmoothCursorEngine | null = null;

const reducedMotion = useReducedMotion();

onMounted(() => {
	const cursor = cursorRef.value;
	if (!cursor) return;

	// `useReducedMotion()` is called above, so its own `onMounted` (registered
	// first, invoked first) has already asked the browser: this is the real
	// mount-time answer. It goes in as a plain creation option — no snap —
	// exactly like the source wrapper's mount-time read.
	let appliedReducedMotion = reducedMotion.value;

	engine = createSmoothCursor(
		{ cursor },
		{
			springConfig,
			reducedMotion: appliedReducedMotion,
			onVisibleChange: (next) => {
				visible.value = next;
			},
		}
	);

	// Armed here, after the engine exists, AND gated on the value differing
	// from the one the engine was created with. The composable seeds its ref
	// with `false` and only reads `matchMedia` from `onMounted`, so a watcher
	// created in setup would see that mount-time `false -> true` seeding as a
	// change on a machine that asks for reduced motion, and would hit the
	// core's stop-and-snap branch at mount — a branch the core documents as
	// reachable only from a genuine media-query change event. With the guard,
	// only a real change ever reaches `setOptions`.
	watch(
		reducedMotion,
		(next) => {
			if (next === appliedReducedMotion) return;
			appliedReducedMotion = next;
			engine?.setOptions({ reducedMotion: next });
		},
		{ flush: "post" }
	);
});

onBeforeUnmount(() => {
	engine?.destroy();
	engine = null;
});

watch(
	() => springConfig,
	(next) => engine?.setOptions({ springConfig: next }),
	{ flush: "post" }
);
</script>

<template>
	<div
		ref="cursor"
		aria-hidden="true"
		:class="
			cn(
				'pointer-events-none fixed top-0 left-0 z-[9999]',
				visible ? 'opacity-100' : 'opacity-0',
				className
			)
		"
		style="will-change: transform; translate: -50% -50%"
	>
		<slot name="cursor">
			<!-- Default cursor: arrow SVG -->
			<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" focusable="false">
				<path
					fill="currentColor"
					d="M9.391 2.32C8.42 1.56 7 2.253 7 3.486V28.41c0 1.538 1.966 2.18 2.874.938l6.225-8.523a2 2 0 0 1 1.615-.82h9.69c1.512 0 2.17-1.912.978-2.844z"
				/>
			</svg>
		</slot>
	</div>
</template>
