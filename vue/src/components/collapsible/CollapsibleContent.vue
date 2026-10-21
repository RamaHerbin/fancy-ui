<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface CollapsibleContentProps {
	/**
	 * Keeps the children mounted while the content is closed. On by default: a
	 * closed panel stays in the DOM (inert and hidden) so server-rendered
	 * markup, find-in-page and form state survive. Pass `false` to unmount the
	 * children once the collapse has finished and mount them again on open, for
	 * content that should not run while closed (an iframe, a video).
	 */
	forceMount?: boolean;
	/** Additional CSS classes, merged onto the inner body so padding collapses with the panel. */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useAttrs, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import { COLLAPSIBLE_KEY } from "./types.js";
import { isCollapseEnd, prefersReducedMotionNow, settleDelayMs } from "./collapsible-core.js";

defineOptions({ name: "CollapsibleContent", inheritAttrs: false });

const attrs = useAttrs();

const { forceMount = true, class: className } = defineProps<CollapsibleContentProps>();

defineSlots<{ default?(): unknown }>();

const el = useTemplateRef<HTMLDivElement>("el");
defineExpose({ ref: el });

// Undefined outside a Collapsible: nothing is ever open, so the content stays
// collapsed, the same graceful degradation as the trigger.
const context = COLLAPSIBLE_KEY.useOptional();
const open = computed(() => context?.open ?? false);

// "Closed and finished collapsing". Starts true for a panel that is born
// closed, so a server-rendered closed panel is already inert and hidden. It is
// only ever set from the settle path below and cleared the moment the panel
// opens, which is what makes a double toggle safe: a close that gets
// interrupted never reaches its own settle.
const settled = ref(!(context?.open ?? false));
const hidden = computed(() => settled.value && !open.value);

let timer: ReturnType<typeof setTimeout> | undefined;

function clearTimer() {
	if (timer !== undefined) clearTimeout(timer);
	timer = undefined;
}

// Reacts to `open` only. A close settles on `transitionend`; the deadline is
// the net for the cases where that event never comes (reduced motion, no
// declared duration, a panel inside a hidden ancestor). A `post` watcher
// without `immediate` never runs on the server.
watch(
	open,
	(isOpen) => {
		clearTimer();
		if (isOpen) {
			settled.value = false;
			return;
		}
		if (settled.value) return;
		const node = el.value;
		const delay = settleDelayMs(node ? getComputedStyle(node) : null, prefersReducedMotionNow());
		if (delay === 0) {
			settled.value = true;
			return;
		}
		timer = setTimeout(() => {
			timer = undefined;
			settled.value = true;
		}, delay);
	},
	{ flush: "post" }
);

onBeforeUnmount(clearTimer);

function handleTransitionEnd(event: TransitionEvent) {
	if (isCollapseEnd(event) && !open.value) {
		clearTimer();
		settled.value = true;
	}
}
</script>

<template>
	<div
		ref="el"
		@transitionend="handleTransitionEnd"
		v-bind="attrs"
		:id="context?.contentId ?? (attrs.id as string | undefined)"
		class="ft-collapsible-content grid grid-rows-[0fr] transition-[grid-template-rows] duration-[var(--ft-collapsible-duration,240ms)] ease-[cubic-bezier(0.16,1,0.3,1)] data-[state=open]:grid-rows-[1fr] motion-reduce:transition-none"
		:data-state="open ? 'open' : 'closed'"
		:inert="open ? undefined : true"
		:style="hidden ? { visibility: 'hidden' } : undefined"
	>
		<div class="min-h-0 overflow-hidden">
			<div :class="cn('ft-collapsible-body', className)">
				<slot v-if="forceMount || !hidden" />
			</div>
		</div>
	</div>
</template>
