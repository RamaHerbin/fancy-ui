<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/drawer/BasicUsage.svelte.
import { ref } from "vue";
import { Button, Drawer } from "fancy-ui-vue";

const open = ref(false);
const sortBy = ref("recent");
</script>

<template>
	<Button :onclick="() => (open = true)">Open filters</Button>

	<Drawer sound v-model:open="open" title="Filters" description="Drag down to close.">
		<div class="flex flex-col gap-2">
			<label class="text-muted-foreground flex items-center gap-2 text-[13px]">
				<input type="radio" name="sort" value="recent" v-model="sortBy" />
				Most recent
			</label>
			<label class="text-muted-foreground flex items-center gap-2 text-[13px]">
				<input type="radio" name="sort" value="popular" v-model="sortBy" />
				Most popular
			</label>
		</div>
	</Drawer>
</template>
