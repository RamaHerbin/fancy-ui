<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/sheet/BasicUsage.svelte.
import { ref } from "vue";
import { Button, Sheet, Switch } from "fancy-ui-vue";

const open = ref(false);
const notifications = ref(true);
const compactMode = ref(false);
</script>

<template>
	<Button :onclick="() => (open = true)">Open settings</Button>

	<Sheet
		sound
		v-model:open="open"
		title="Settings"
		description="Update your workspace preferences."
	>
		<div class="flex items-center justify-between">
			<span class="text-muted-foreground text-[13px]">Notifications</span>
			<Switch sound v-model:checked="notifications" label="Notifications" />
		</div>
		<div class="flex items-center justify-between">
			<span class="text-muted-foreground text-[13px]">Compact mode</span>
			<Switch sound v-model:checked="compactMode" label="Compact mode" />
		</div>
	</Sheet>
</template>
