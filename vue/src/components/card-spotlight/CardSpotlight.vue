<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface CardSpotlightProps {
	/** Classes for the outer container */
	class?: HTMLAttributes["class"];
	/** Classes for the content wrapper */
	slotClass?: string;
	/** Radius of the spotlight gradient */
	gradientSize?: number;
	/** Color of the spotlight */
	gradientColor?: string;
	/** Opacity of the gradient overlay */
	gradientOpacity?: number;
	/**
	 * Beta, off by default. On a display that reports HDR, add a hot core to the spotlight in a
	 * WebGPU layer with extended tone mapping, brighter than SDR white.
	 * Elsewhere nothing changes.
	 */
	hdr?: boolean;
}
</script>

<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import { attachHdrLight, hdrLightAvailable } from "../../internals/hdr/hdr-light.js";
import { createCardSpotlightProbe } from "./card-spotlight-hdr.js";

defineOptions({ name: "CardSpotlight", inheritAttrs: false });

const {
	class: className = "",
	slotClass = "",
	gradientSize = 200,
	gradientColor = "#262626",
	gradientOpacity = 0.8,
	hdr = false,
} = defineProps<CardSpotlightProps>();

defineSlots<{ default?(): unknown }>();

const mouseX = ref(-gradientSize * 10);
const mouseY = ref(-gradientSize * 10);

function handleMouseMove(e: MouseEvent) {
	const target = e.currentTarget as HTMLElement;
	const rect = target.getBoundingClientRect();
	hovering = true;
	mouseX.value = e.clientX - rect.left;
	mouseY.value = e.clientY - rect.top;
}

/** The overlay exists only where WebGPU and an HDR display do: never on the server. */
const hdrCapable = ref(false);
onMounted(() => {
	hdrCapable.value = hdrLightAvailable();
});

let hovering = false;
const host = useTemplateRef<HTMLDivElement>("host");
const hdrCanvas = useTemplateRef<HTMLCanvasElement>("hdrCanvas");

function handleMouseLeave() {
	hovering = false;
	mouseX.value = -gradientSize * 10;
	mouseY.value = -gradientSize * 10;
}

watch(
	[host, hdrCanvas],
	([hostEl, canvasEl], _old, onCleanup) => {
		if (!hostEl || !canvasEl) return;
		onCleanup(
			attachHdrLight({
				host: hostEl,
				canvas: canvasEl,
				pad: 0,
				probe: createCardSpotlightProbe(() => ({
					x: mouseX.value,
					y: mouseY.value,
					hovering,
					size: gradientSize,
					color: gradientColor,
					opacity: gradientOpacity,
				})),
			})
		);
	},
	{ flush: "post" }
);

const backgroundStyle = computed(
	() =>
		`radial-gradient(circle at ${mouseX.value}px ${mouseY.value}px, ${gradientColor} 0%, rgba(0, 0, 0, 0) 70%)`
);
</script>

<template>
	<div
		ref="host"
		:class="
			cn(
				'group relative flex size-full overflow-hidden rounded-xl border bg-neutral-100 text-black dark:bg-neutral-900 dark:text-white',
				className
			)
		"
		@mousemove="handleMouseMove"
		@mouseleave="handleMouseLeave"
	>
		<div :class="cn('relative z-10', slotClass)">
			<slot />
		</div>
		<div
			class="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 motion-safe:transition-opacity motion-safe:duration-300"
			:style="{ background: backgroundStyle, opacity: gradientOpacity }"
		></div>
		<!-- Light above SDR white, on HDR displays only. -->
		<canvas
			v-if="hdr && hdrCapable"
			ref="hdrCanvas"
			class="pointer-events-none absolute inset-0 h-full w-full"
			aria-hidden="true"
		></canvas>
	</div>
</template>
