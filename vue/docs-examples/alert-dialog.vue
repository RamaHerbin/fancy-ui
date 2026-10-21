<script setup lang="ts">
import { ref } from "vue";
import { AlertDialog, Button } from "fancy-ui-vue";

const status = ref("");
</script>

<template>
	<AlertDialog
		sound
		title="Delete this project?"
		description="This action is irreversible. All data will be lost."
		confirm-label="Delete"
		:on-confirm="() => (status = 'Project deleted.')"
		:on-cancel="() => (status = 'Cancelled.')"
	>
		<template #trigger>
			<Button variant="destructive">Delete project</Button>
		</template>
	</AlertDialog>

	<p v-if="status" class="text-muted-foreground mt-2 text-[12px]">{{ status }}</p>
</template>
