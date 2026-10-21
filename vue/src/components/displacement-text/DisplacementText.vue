<script lang="ts">
import type { HTMLAttributes } from "vue";

/**
 * DisplacementText - Large text rendered as a WebGL plane that bulges toward the
 * viewer near the cursor.
 *
 * The text is rasterized to a 2048x2048 canvas and uploaded as a texture; a
 * vertex shader offsets each vertex's `z` by its distance to a `uDisplacement`
 * uniform, which a raycast against an invisible hit-plane updates on every
 * `pointermove`. With reduced motion preferred, without WebGL, or after a lost
 * GPU context, the real text is shown instead, styled like the resting frame.
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
	/** Upper bound for the renderer's device pixel ratio */
	maxDpr?: number;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import {
	DEFAULT_MAX_DPR,
	STATIC_LAYER_STYLE,
	mountDisplacementText,
	staticTextStyle,
	type DisplacementTextController,
	type DisplacementTextMode,
} from "./displacement-text-core.js";

defineOptions({ name: "DisplacementText", inheritAttrs: false });

const {
	text = "Hover Me",
	fontSize = 200,
	font = "Inter, sans-serif",
	color,
	lightColor = "#000000",
	darkColor = "#ffffff",
	maxDpr = DEFAULT_MAX_DPR,
	class: className = "",
} = defineProps<DisplacementTextProps>();

const containerRef = useTemplateRef<HTMLDivElement>("container");
let controller: DisplacementTextController | null = null;

// Starts "static" so the server render (and the first client render) carry the
// real text; the controller promotes to the canvas once motion is allowed and
// WebGL is available, and drops back when reduced motion turns on.
const mode = ref<DisplacementTextMode>("static");
const textColor = ref(color ?? lightColor);
const staticStyle = computed(() => staticTextStyle({ fontSize, font }, textColor.value));

/**
 * Fail quiet on anything the engine throws while building, so an exception
 * never escapes `onMounted` and takes the hydrating app down; the static text
 * simply stays.
 */
function safely<T>(run: () => T): T | null {
	try {
		return run();
	} catch {
		return null;
	}
}

// Options are diffed by the engine: nothing here rebuilds the scene.
watch(
	() => ({ text, fontSize, font, color, lightColor, darkColor, maxDpr }),
	(next) => {
		safely(() => controller?.setOptions(next));
	},
	{ flush: "post" }
);

onMounted(() => {
	const container = containerRef.value;
	if (!container) return;

	controller = safely(() =>
		mountDisplacementText(
			{ container },
			{
				text,
				fontSize,
				font,
				color,
				lightColor,
				darkColor,
				maxDpr,
				onChange: (state) => {
					mode.value = state.mode;
					textColor.value = state.color;
				},
			}
		)
	);
});

onBeforeUnmount(() => {
	controller?.destroy();
	controller = null;
});
</script>

<template>
	<div
		ref="container"
		:class="cn('relative h-[400px] w-full', className)"
		role="img"
		:aria-label="text"
	>
		<div v-if="mode === 'static'" :style="STATIC_LAYER_STYLE">
			<span :style="staticStyle">{{ text }}</span>
		</div>
	</div>
</template>
