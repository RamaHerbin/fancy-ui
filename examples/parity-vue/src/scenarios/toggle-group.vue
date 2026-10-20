<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/toggle-group/BasicUsage.svelte.
import { ref } from "vue";
import { ToggleGroup, ToggleGroupItem } from "fancy-ui-vue";

const alignment = ref<string | string[]>("left");
</script>

<template>
	<ToggleGroup sound v-model:value="alignment" label="Text alignment">
		<ToggleGroupItem value="left" label="Align left">
			<svg
				class="size-4"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				aria-hidden="true"
			>
				<line x1="3" y1="6" x2="21" y2="6" />
				<line x1="3" y1="12" x2="15" y2="12" />
				<line x1="3" y1="18" x2="18" y2="18" />
			</svg>
		</ToggleGroupItem>
		<ToggleGroupItem value="center" label="Align center">
			<svg
				class="size-4"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				aria-hidden="true"
			>
				<line x1="3" y1="6" x2="21" y2="6" />
				<line x1="6" y1="12" x2="18" y2="12" />
				<line x1="4" y1="18" x2="20" y2="18" />
			</svg>
		</ToggleGroupItem>
		<ToggleGroupItem value="right" label="Align right">
			<svg
				class="size-4"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				aria-hidden="true"
			>
				<line x1="3" y1="6" x2="21" y2="6" />
				<line x1="9" y1="12" x2="21" y2="12" />
				<line x1="6" y1="18" x2="21" y2="18" />
			</svg>
		</ToggleGroupItem>
	</ToggleGroup>
</template>
