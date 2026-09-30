<script lang="ts">
import type { HTMLAttributes } from "vue";

/** One avatar's data: an identity, a name, a role line, and the image shown. */
export interface TooltipItem {
	id: number | string;
	name: string;
	designation: string;
	image: string;
}

export interface AnimatedTooltipProps {
	/** Array of items to display */
	items: TooltipItem[];
	/** Additional CSS classes for the container */
	class?: HTMLAttributes["class"];
	/**
	 * Tint of the presence ring and the light sweep under the name. Any CSS
	 * colour (`"#f5a97f"`, `"oklch(0.7 0.14 160)"`, `"var(--primary)"`).
	 * Leave unset for the default soft iridescent pair, which adapts to the
	 * light and dark themes.
	 */
	accent?: string;
	/** Avatar diameter in pixels. */
	size?: number;
}
</script>

<script setup lang="ts">
/**
 * The row. It owns every piece of state the source keeps at the top of its
 * single file — the hovered item's id, the pointer's horizontal offset and the
 * reduced-motion query — because all of it is shared by every avatar in the
 * row, and that sharing is observable: the source's `mousemove` handler is
 * guarded by a ROW-WIDE test (`hoveredId === null`), not a per-item one, and
 * the neighbour parting is a function of the active INDEX, which only the row
 * knows.
 *
 * `mouseX` is read only through `pointer`'s getters, never in this template,
 * so a pointer sample does not re-render the row: only the avatar that is
 * actually drawing a tooltip depends on it.
 */
import { computed, ref } from "vue";

import { cn } from "../../utils.js";
import { useReducedMotion } from "../../internals/motion/use-media-query.js";
import AnimatedTooltipAvatar from "./AnimatedTooltipAvatar.vue";
import type { TooltipPointer } from "./AnimatedTooltipAvatar.vue";

defineOptions({ name: "AnimatedTooltip", inheritAttrs: false });

const { items, class: className, accent, size = 56 } = defineProps<AnimatedTooltipProps>();

const reduced = useReducedMotion();

const hoveredId = ref<number | string | null>(null);
const mouseX = ref(0);

/** Index of the active item, or -1 when nothing is hovered/focused. */
const activeIndex = computed(() =>
	hoveredId.value === null ? -1 : items.findIndex((item) => item.id === hoveredId.value)
);

// Pointer offset from the avatar centre, normalised to [-1, 1]. The card
// leans and slides toward the pointer; reduced motion keeps it upright.
const lean = computed(() =>
	reduced.value ? 0 : Math.max(-1, Math.min(1, mouseX.value / (size / 2)))
);

// A getter object rather than two `computed`s handed down as props: the values
// stay tracked at the point they are READ (inside the active avatar), which is
// where the source reads them too.
const pointer: TooltipPointer = {
	get rotation() {
		return lean.value * 7;
	},
	get translation() {
		return lean.value * 14;
	},
};

/** How far item `i` steps aside to make room for the active one. */
function partOffset(i: number): number {
	if (activeIndex.value < 0 || reduced.value) return 0;
	const d = i - activeIndex.value;
	const distance = Math.abs(d);
	if (distance === 1) return Math.sign(d) * 6;
	if (distance === 2) return Math.sign(d) * 2;
	return 0;
}

// The source's `style="--_at-size: {size}px; {ringStyle}"`, as an object: a
// string `style` goes through `cssText`, which drops custom properties in jsdom.
const rootStyle = computed(() => {
	const style: Record<string, string> = { "--_at-size": `${size}px` };
	if (accent) {
		style["--at-accent"] = accent;
		style["--at-accent-2"] = `color-mix(in oklab, ${accent} 62%, white)`;
	}
	return style;
});

function handleMouseEnter(event: MouseEvent, itemId: number | string): void {
	// Reset mouseX first to prevent offset from previous item
	const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
	mouseX.value = event.clientX - rect.left - rect.width / 2;
	hoveredId.value = itemId;
}

function handleMouseMove(event: MouseEvent): void {
	if (hoveredId.value === null) return;
	const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
	mouseX.value = event.clientX - rect.left - rect.width / 2;
}

function handleMouseLeave(): void {
	hoveredId.value = null;
	mouseX.value = 0;
}

function handleFocusIn(itemId: number | string): void {
	mouseX.value = 0;
	hoveredId.value = itemId;
}

function handleFocusOut(): void {
	hoveredId.value = null;
	mouseX.value = 0;
}
</script>

<template>
	<div :class="cn('at-root flex flex-row items-center', className)" :style="rootStyle">
		<AnimatedTooltipAvatar
			v-for="(item, i) in items"
			:key="item.id"
			:item="item"
			:active="hoveredId === item.id"
			:shift="partOffset(i)"
			:reduced="reduced"
			:pointer="pointer"
			:on-item-mouse-enter="handleMouseEnter"
			:on-item-mouse-leave="handleMouseLeave"
			:on-item-mouse-move="handleMouseMove"
			:on-item-focus-in="handleFocusIn"
			:on-item-focus-out="handleFocusOut"
		/>
	</div>
</template>

<style scoped>
.at-root {
	/* Public, class-themeable knobs with private fallbacks. */
	--_at-a: var(--at-accent, oklch(0.62 0.13 295));
	--_at-b: var(--at-accent-2, oklch(0.7 0.1 220));
	--_at-core: color-mix(in oklab, var(--_at-a) 45%, white);
	--_at-sep: var(--at-separator, var(--background, #ffffff));
	--_at-ease-out: cubic-bezier(0.16, 1, 0.3, 1);
	--_at-ease-rise: cubic-bezier(0.34, 1.32, 0.64, 1);
	--_at-ease-inout: cubic-bezier(0.4, 0, 0.2, 1);
	--_at-card-bg: rgba(255, 255, 255, 0.85);
	--_at-card-line: rgba(0, 0, 0, 0.08);
	--_at-card-hi: rgba(255, 255, 255, 0.9);
	--_at-card-shadow: 0 10px 28px -12px rgba(0, 0, 0, 0.28), 0 2px 6px -2px rgba(0, 0, 0, 0.1);
	--_at-name: #111113;
	--_at-role: rgba(0, 0, 0, 0.55);
}

/* The source's `:global(.dark) .at-root`. Spelled without `:global()` here:
   the scoped compiler replaces a whole selector that contains `:global(...)`
   with the wrapped part alone (it would emit a bare `.dark`), while a plain
   ancestor class is left unscoped and only `.at-root` gets the attribute. */
.dark .at-root {
	--_at-a: var(--at-accent, oklch(0.78 0.1 295));
	--_at-b: var(--at-accent-2, oklch(0.83 0.08 210));
	--_at-card-bg: rgba(20, 20, 22, 0.85);
	--_at-card-line: rgba(255, 255, 255, 0.1);
	--_at-card-hi: rgba(255, 255, 255, 0.06);
	--_at-card-shadow: 0 14px 32px -12px rgba(0, 0, 0, 0.8), 0 2px 6px -2px rgba(0, 0, 0, 0.5);
	--_at-name: #f4f4f5;
	--_at-role: rgba(255, 255, 255, 0.55);
}
</style>
