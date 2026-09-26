<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface CardItemProps {
	/** HTML element to render as. */
	as?: string;
	/** Additional classes. */
	class?: HTMLAttributes["class"];
	/** X translation on hover (px). */
	translateX?: number | string;
	/** Y translation on hover (px). */
	translateY?: number | string;
	/** Z translation (depth) on hover (px). */
	translateZ?: number | string;
	/** X rotation on hover (deg). */
	rotateX?: number | string;
	/** Y rotation on hover (deg). */
	rotateY?: number | string;
	/** Z rotation on hover (deg). */
	rotateZ?: number | string;
}
</script>

<script setup lang="ts">
import { computed } from "vue";

import { cn } from "../../utils.js";
import { CARD3D_CONTEXT, NEVER_ENTERED } from "./context.js";

defineOptions({ name: "CardItem", inheritAttrs: false });

const {
	as = "div",
	class: className = "",
	translateX = 0,
	translateY = 0,
	translateZ = 0,
	rotateX = 0,
	rotateY = 0,
	rotateZ = 0,
} = defineProps<CardItemProps>();

/**
 * The Svelte source reads `getContext("card3d:mouseEntered")` and calls it
 * unguarded, so a `CardItem` used outside a `CardContainer` crashes there. Vue
 * degrades instead: no provider means "never entered", which is exactly the
 * rest transform the Svelte item renders before the pointer arrives. That keeps
 * a standalone item server-renderable (and identical across renders), and costs
 * nothing inside a container, where the provider always wins.
 */
const getMouseEntered = CARD3D_CONTEXT.useOptional() ?? NEVER_ENTERED;

const transform = computed(() =>
	getMouseEntered()
		? `translateX(${translateX}px) translateY(${translateY}px) translateZ(${translateZ}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`
		: `translateX(0px) translateY(0px) translateZ(0px) rotateX(0deg) rotateY(0deg) rotateZ(0deg)`
);
</script>

<template>
	<component
		:is="as"
		:class="cn('w-fit transition duration-500 ease-in-out', className)"
		:style="{ transform }"
	>
		<slot />
	</component>
</template>
