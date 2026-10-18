<script lang="ts">
import type { HTMLAttributes } from "vue";

/**
 * DisplacementText - Large text rendered as a WebGL plane that bulges toward the
 * viewer near the cursor.
 *
 * The text is rasterized to a 2048x2048 canvas and uploaded as a texture; a
 * vertex shader offsets each vertex's `z` by its distance to a `uDisplacement`
 * uniform, which a raycast against an invisible hit-plane updates on every
 * `pointermove`.
 */
export interface DisplacementTextProps {
	/** Text to display */
	text?: string;
	/** Font size in pixels */
	fontSize?: number;
	/** Font family */
	font?: string;
	/** Fixed text color (overrides theme colors) */
	color?: string;
	/** Text color in light mode */
	lightColor?: string;
	/** Text color in dark mode */
	darkColor?: string;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import { createDisplacementText, type DisplacementTextEngine } from "./displacement-text-core.js";

defineOptions({ name: "DisplacementText", inheritAttrs: false });

const {
	text = "Hover Me",
	fontSize = 200,
	font = "Inter, sans-serif",
	color,
	lightColor = "#000000",
	darkColor = "#ffffff",
	class: className = "",
} = defineProps<DisplacementTextProps>();

const containerRef = useTemplateRef<HTMLDivElement>("container");
let engine: DisplacementTextEngine | null = null;

/**
 * three throws when the host cannot hand out a WebGL context — fail quiet.
 *
 * The engine raises from its `new THREE.WebGLRenderer(...)` line, which runs
 * before anything is appended to the container, so swallowing the error leaves
 * the host exactly as the server rendered it: the empty, labelled box below.
 * Letting it escape would instead throw out of `onMounted` and take the
 * hydrating app down with it. The guard sits here rather than in the engine
 * because a rebuild raises the same way, so both entry points need it.
 */
function safely<T>(run: () => T): T | null {
	try {
		return run();
	} catch {
		return null;
	}
}

// Every prop rebuilds the scene — the engine keeps that behaviour.
watch(
	() => ({ text, fontSize, font, color, lightColor, darkColor }),
	(next) => {
		if (!engine) return;
		safely(() => engine?.setOptions(next));
	},
	{ flush: "post" }
);

onMounted(() => {
	const container = containerRef.value;
	if (!container) return;

	engine = safely(() =>
		createDisplacementText({ container }, { text, fontSize, font, color, lightColor, darkColor })
	);
});

onBeforeUnmount(() => {
	engine?.destroy();
	engine = null;
});
</script>

<template>
	<div
		ref="container"
		:class="cn('relative h-[400px] w-full', className)"
		role="img"
		:aria-label="text"
	></div>
</template>
