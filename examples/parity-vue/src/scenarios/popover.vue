<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/popover/BasicUsage.svelte.
import { ref } from "vue";
import { Popover } from "fancy-ui-vue";

const width = ref("100%");
const height = ref("25px");
</script>

<template>
	<Popover sound class="w-[220px]">
		<template #trigger>⚙ Options</template>

		<span class="text-[13px] font-semibold">Dimensions</span>
		<div class="flex gap-2">
			<input
				v-model="width"
				aria-label="Width"
				class="border-input bg-background text-foreground min-w-0 flex-1 rounded-[6px] border px-2 py-[5px] text-[12px]"
			/>
			<input
				v-model="height"
				aria-label="Height"
				class="border-input bg-background text-foreground min-w-0 flex-1 rounded-[6px] border px-2 py-[5px] text-[12px]"
			/>
		</div>
	</Popover>
</template>
