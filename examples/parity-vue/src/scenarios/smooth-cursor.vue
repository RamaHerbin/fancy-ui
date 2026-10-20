<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/smooth-cursor/BasicUsage.svelte.
import { ref } from "vue";
import { SmoothCursor } from "fancy-ui-vue";

// Scope the cursor to this canvas: it mounts while the pointer is inside.
const inside = ref(false);
</script>

<template>
	<div
		class="w-full rounded-2xl border border-black/[0.08] bg-[#f4f4f5] p-1.5 dark:border-white/[0.08] dark:bg-[#0b0b0c]"
	>
		<div
			role="presentation"
			class="relative flex h-72 cursor-none items-center justify-center overflow-hidden rounded-xl border border-black/[0.08] bg-[#fafafa] bg-[radial-gradient(rgba(0,0,0,0.09)_1px,transparent_1px)] [background-size:18px_18px] dark:border-white/[0.08] dark:bg-[#141416] dark:bg-[radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)]"
			@pointerenter="inside = true"
			@pointerleave="inside = false"
		>
			<div class="flex flex-col items-center gap-2 select-none">
				<span
					class="rounded-full border border-black/[0.08] bg-white px-3 py-1 text-xs text-neutral-500 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-neutral-400"
				>
					Move your pointer here
				</span>
				<span class="text-[11px] text-neutral-400 dark:text-neutral-500">
					Rest for a moment and the name pill dims
				</span>
			</div>
		</div>
	</div>

	<SmoothCursor v-if="inside" label="You" />
</template>
