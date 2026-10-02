<script lang="ts">
/**
 * One row of the scrolling column. Its own SFC — not a repeated block in the
 * parent template — because the observer is per-node (`use:inView` was
 * applied per `<section>` in the source) and a composable cannot be called in
 * a loop. Internal: never exported from the package, and it renders exactly
 * the `<section>` the source renders, so the DOM contract is unchanged. The
 * section is this component's single root element, which is what lets the
 * parent's `<style scoped>` rules still reach it.
 */
export interface StickyScrollItemProps {
	/** This row's position in the items list. */
	index: number;
	/** True only for the current `activeIndex`. */
	active: boolean;
	/** Called with this row's index whenever the row should become active. */
	onActivate: (index: number) => void;
}
</script>

<script setup lang="ts">
import { useTemplateRef } from "vue";
import { useInView } from "../../internals/motion/use-in-view.js";

defineOptions({ name: "StickyScrollItem", inheritAttrs: false });

const { index, active, onActivate } = defineProps<StickyScrollItemProps>();

defineSlots<{ default(): unknown }>();

const el = useTemplateRef<HTMLElement>("el");

// `rootMargin: "-50% 0px -50% 0px"` is a zero-height band pinned to the
// viewport's vertical centre — the `-50%`s on both edges collapse the
// effective root rect to nothing. Sections are non-overlapping stacked
// blocks, so at most one can straddle that band at a time and "the last
// section to report entering wins" is a race-free way to derive the active
// index. Leaving the band (`false`) deliberately moves nothing.
useInView(el, () => ({
	once: false,
	threshold: 0,
	rootMargin: "-50% 0px -50% 0px",
	onChange: (visible: boolean) => {
		if (visible) onActivate(index);
	},
}));
</script>

<template>
	<section
		ref="el"
		class="ft-stickyscroll-item"
		:data-index="index"
		:data-active="active"
		@focusin="onActivate(index)"
	>
		<slot />
	</section>
</template>
