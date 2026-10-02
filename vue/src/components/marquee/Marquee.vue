<script lang="ts">
import type { HTMLAttributes } from "vue";

/**
 * Props for Marquee
 *
 * An infinite scrolling row (or column) of content, built by rendering
 * multiple copies of its children side by side and animating the whole
 * track by `-100% - gap` on a seamless loop.
 */
export interface MarqueeProps {
	/** Reverse the scroll direction */
	reverse?: boolean;
	/** Pause the animation on hover */
	pauseOnHover?: boolean;
	/** Scroll vertically instead of horizontally */
	vertical?: boolean;
	/** Number of times to repeat the children track */
	repeat?: number;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { cn } from "../../utils.js";

defineOptions({ name: "Marquee", inheritAttrs: false });

defineSlots<{ default?(): unknown }>();

const {
	class: className,
	reverse = false,
	pauseOnHover = false,
	vertical = false,
	repeat = 4,
} = defineProps<MarqueeProps>();
</script>

<template>
	<div
		:class="
			cn(
				'group flex [gap:var(--gap)] overflow-hidden p-2 [--duration:40s] [--gap:1rem]',
				vertical ? 'flex-col' : 'flex-row',
				className
			)
		"
	>
		<div
			v-for="(_, index) in repeat"
			:key="index"
			:class="
				cn(
					'flex shrink-0 justify-around [gap:var(--gap)]',
					vertical ? 'animate-marquee-vertical flex-col' : 'animate-marquee flex-row',
					pauseOnHover ? 'group-hover:[animation-play-state:paused]' : ''
				)
			"
			:style="{ animationDirection: reverse ? 'reverse' : 'normal' }"
		>
			<slot />
		</div>
	</div>
</template>

<style scoped>
.animate-marquee {
	animation: marquee var(--duration) linear infinite;
}

.animate-marquee-vertical {
	animation: marquee-vertical var(--duration) linear infinite;
}

@keyframes marquee {
	from {
		transform: translateX(0);
	}
	to {
		transform: translateX(calc(-100% - var(--gap)));
	}
}

@keyframes marquee-vertical {
	from {
		transform: translateY(0);
	}
	to {
		transform: translateY(calc(-100% - var(--gap)));
	}
}
</style>
