<script setup lang="ts">
import { ref } from "vue";
import { Button, Dialog } from "fancy-ui-vue";

const open = ref(false);
const email = ref("");
</script>

<template>
	<Dialog
		v-model:open="open"
		title="Invite a member"
		description="Send an email invite to join the workspace."
	>
		<template #trigger>
			<Button>Invite member</Button>
		</template>

		<input
			v-model="email"
			type="email"
			placeholder="email@example.com"
			aria-label="Email address"
			class="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm"
		/>

		<template #footer>
			<Button variant="outline" :onclick="() => (open = false)">Cancel</Button>
			<Button :onclick="() => (open = false)">Invite</Button>
		</template>
	</Dialog>
</template>
