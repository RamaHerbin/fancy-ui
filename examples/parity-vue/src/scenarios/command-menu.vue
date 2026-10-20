<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/command-menu/BasicUsage.svelte.
import { ref } from "vue";
import { Button, CommandMenu } from "fancy-ui-vue";
import type { CommandItem } from "fancy-ui-vue";

const open = ref(false);
const picked = ref("");

const items: CommandItem[] = [
	{ id: "button", label: "Button", meta: "Actions" },
	{ id: "icon-button", label: "Icon Button", meta: "Actions" },
	{ id: "rainbow-button", label: "Rainbow Button", meta: "Buttons" },
	{ id: "settings", label: "Settings" },
];

function handleSelect(item: CommandItem) {
	picked.value = item.label;
}
</script>

<template>
	<div class="flex flex-col items-start gap-3">
		<Button :onclick="() => (open = true)">Open command menu</Button>
		<p v-if="picked" class="text-muted-foreground text-[12px]">Last picked: {{ picked }}</p>
	</div>

	<CommandMenu sound v-model:open="open" :items="items" :on-select="handleSelect" />
</template>
