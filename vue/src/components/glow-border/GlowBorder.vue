<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface GlowBorderProps {
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
	/** Border radius in pixels */
	borderRadius?: number;
	/** Glow color(s) - single or array for gradient */
	color?: string | string[];
	/** Border thickness in pixels */
	borderWidth?: number;
	/** Animation duration in seconds */
	duration?: number;
}
</script>

<script setup lang="ts">
import { computed } from "vue";
import { cn } from "../../utils.js";

defineOptions({ name: "GlowBorder", inheritAttrs: false });

const {
	class: className = "",
	borderRadius = 10,
	color = "#FFF",
	borderWidth = 2,
	duration = 10,
} = defineProps<GlowBorderProps>();

const colorString = computed(() =>
	Array.isArray(color) ? color.join(",") : color
);

const styles = computed(() => ({
	"--glow-border-radius": `${borderRadius}px`,
	"--glow-border-width": `${borderWidth}px`,
	"--glow-duration": `${duration}s`,
	"background-image": `radial-gradient(transparent, transparent, ${colorString.value}, transparent, transparent)`,
	"background-size": "300% 300%",
	mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
	"-webkit-mask":
		"linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
	"-webkit-mask-composite": "xor",
	"mask-composite": "exclude",
	padding: "var(--glow-border-width)",
	"border-radius": "var(--glow-border-radius)",
}));
</script>

<template>
	<div
		:class="
			cn(
				'animate-glow pointer-events-none absolute inset-0 size-full rounded-[inherit] will-change-[background-position]',
				className
			)
		"
		:style="styles"
	></div>
</template>

<style scoped>
@keyframes glow {
	0% {
		background-position: 0% 0%;
	}
	50% {
		background-position: 100% 100%;
	}
	100% {
		background-position: 0% 0%;
	}
}

.animate-glow {
	animation: glow var(--glow-duration) linear infinite;
}

@media (prefers-reduced-motion: reduce) {
	.animate-glow {
		animation: none;
	}
}
</style>
