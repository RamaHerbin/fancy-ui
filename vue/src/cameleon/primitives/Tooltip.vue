<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { PartState } from "../types.js";

export interface TooltipProps {
	/** Text shown in the bubble on hover / keyboard focus. */
	content: string;
	/** Force a visual state (focus / error) for the /skins state matrix. */
	demoState?: PartState;
	/** Force the bubble visible (state matrix). */
	demoOpen?: boolean;
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed } from "vue";
import { cn } from "../../utils.js";
import { useSkin } from "../context.js";

defineOptions({ name: "Tooltip", inheritAttrs: false });

const { content, demoState, demoOpen = false, class: className } = defineProps<TooltipProps>();

/** Trigger contents; defaults to a "?" glyph. */
defineSlots<{ default?: () => unknown }>();

const ctx = useSkin();
const parts = computed(() => ctx.skin.recipes.tooltip({ state: demoState }));
</script>

<template>
	<span :class="cn(parts.root, className)">
		<button type="button" :class="parts.trigger" :aria-label="content">
			<slot>?</slot>
		</button>
		<span role="tooltip" :class="cn(parts.bubble, demoOpen && 'opacity-100')">{{ content }}</span>
	</span>
</template>
