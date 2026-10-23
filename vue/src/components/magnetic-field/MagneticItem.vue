<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface MagneticItemProps {
	/** How heavy the item is. Above 1 it moves and leans less and settles more slowly; below 1 it is livelier. */
	mass?: number;
	/** Per-item pull multiplier, applied on top of the field's `strength`. */
	strength?: number;
	/** Whether the item moves toward the magnet. */
	pull?: boolean;
	/** Whether the item leans toward the magnet. */
	rotate?: boolean;
	/** Renders `<span>` wrappers with `display: inline-block` instead of block `<div>`s, for items that sit inside a line of text or an inline row. */
	inline?: boolean;
	/** Additional CSS classes, on the static outer wrapper. */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useAttrs, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import { MAGNETIC_FIELD_KEY } from "./types.js";

defineOptions({ name: "MagneticItem", inheritAttrs: false });

const attrs = useAttrs();

const {
	mass = 1,
	strength = 1,
	pull = true,
	rotate = true,
	inline = false,
	class: className,
} = defineProps<MagneticItemProps>();

defineSlots<{
	/** The element that reacts. */
	default?(): unknown;
}>();

const outer = useTemplateRef<HTMLElement>("outer");
const inner = useTemplateRef<HTMLElement>("inner");
defineExpose({ ref: outer });

// Undefined outside a MagneticField: the item then renders the same markup
// and simply never moves.
const ctx = MAGNETIC_FIELD_KEY.useOptional();

const tag = computed(() => (inline ? "span" : "div"));

let unregister: (() => void) | null = null;

// Registers once both nodes exist, and again when `inline` swaps them for
// new elements. The field may not have its core yet: the hub buffers.
function registerNodes() {
	unregister?.();
	unregister = null;
	const o = outer.value;
	const i = inner.value;
	if (!ctx || !o || !i) return;
	unregister = ctx.register(o, i, { mass, strength, pull, rotate });
}

onMounted(registerNodes);
watch(tag, registerNodes, { flush: "post" });
onBeforeUnmount(() => {
	unregister?.();
	unregister = null;
});

watch(
	[() => mass, () => strength, () => pull, () => rotate],
	() => {
		const node = outer.value;
		if (ctx && node) ctx.updateItem(node, { mass, strength, pull, rotate });
	},
	{ flush: "post" }
);
</script>

<template>
	<component
		:is="tag"
		ref="outer"
		:class="cn('ft-magnetic-item', className)"
		v-bind="attrs"
		:data-inline="inline || undefined"
	>
		<component :is="tag" ref="inner" class="ft-magnetic-item-inner">
			<slot />
		</component>
	</component>
</template>

<style scoped>
/* The outer node is never transformed: it is the box the field measures. */
.ft-magnetic-item {
	position: relative;
	display: block;
}

.ft-magnetic-item[data-inline] {
	display: inline-block;
}

/* Registered as non-inherited: a write on an inner then restyles that node
   alone, not its whole subtree. The values the core writes ("3.21px",
   "1.20deg") match these syntaxes. */
@property --ft-mf-x {
	syntax: "<length>";
	inherits: false;
	initial-value: 0px;
}

@property --ft-mf-y {
	syntax: "<length>";
	inherits: false;
	initial-value: 0px;
}

@property --ft-mf-r {
	syntax: "<angle>";
	inherits: false;
	initial-value: 0deg;
}

/* The core writes the three variables; the fallbacks keep SSR markup at rest.
   A 2D transform keeps a resting item off the compositor: the core promotes
   an item with `will-change` only while it moves. */
.ft-magnetic-item-inner {
	display: block;
	transform: translate(var(--ft-mf-x, 0px), var(--ft-mf-y, 0px)) rotate(var(--ft-mf-r, 0deg));
	transform-origin: 50% 50%;
}

.ft-magnetic-item[data-inline] > .ft-magnetic-item-inner {
	display: inline-block;
}
</style>
