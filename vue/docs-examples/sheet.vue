<script setup lang="ts">
import { ref } from "vue";
import { Button, Sheet, Switch } from "fancy-ui-vue";

const open = ref(false);
const notifications = ref(true);
const compactMode = ref(false);
</script>

<template>
	<Button :onclick="() => (open = true)">Open settings</Button>

	<Sheet
		v-model:open="open"
		sound
		title="Settings"
		description="Update your workspace preferences."
	>
		<div class="flex items-center justify-between">
			<span class="text-muted-foreground text-[13px]">Notifications</span>
			<Switch v-model:checked="notifications" sound label="Notifications" />
		</div>
		<div class="flex items-center justify-between">
			<span class="text-muted-foreground text-[13px]">Compact mode</span>
			<Switch v-model:checked="compactMode" sound label="Compact mode" />
		</div>
	</Sheet>
</template>
