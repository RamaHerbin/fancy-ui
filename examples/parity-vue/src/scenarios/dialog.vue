<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/dialog/BasicUsage.svelte.
import { ref } from "vue";
import { Button, Dialog } from "fancy-ui-vue";

const open = ref(false);
const email = ref("");
</script>

<template>
	<Dialog
		sound
		v-model:open="open"
		title="Invite a member"
		description="Send an email invite to join the workspace."
	>
		<template #trigger>
			<Button>Invite member</Button>
		</template>
		<input
			type="email"
			v-model="email"
			placeholder="email@example.com"
			aria-label="Email address"
			class="border-input bg-background text-muted-foreground placeholder:text-muted-foreground focus-visible:ring-ring/50 focus-visible:border-ring w-full rounded-lg border px-3 py-2 text-[12px] outline-none focus-visible:ring-2"
		/>
		<template #footer>
			<Button variant="outline" @click="open = false">Cancel</Button>
			<Button @click="open = false">Invite</Button>
		</template>
	</Dialog>
</template>
