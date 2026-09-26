<script setup lang="ts">
import { ref } from "vue";
import { cn, Button, Dialog, Popover, Tooltip } from "fancy-ui-vue";

// SSR/hydration gate for portalled content: the dialog is rendered OPEN (not
// toggled) so `nuxt generate` walks the open-by-default path. Portal renders
// nothing on the server and on the hydration pass — the generated HTML holds
// the trigger only and the panel appears after mount — so this page proves
// that path prerenders and hydrates without a mismatch. The popover and
// tooltip are exercised closed and cover the "closed on the server" branch.
const dialogOpen = ref(true);
</script>

<template>
	<main :class="cn('mx-auto max-w-2xl p-8')">
		<h1 :class="cn('text-2xl font-semibold')">overlay</h1>

		<div :class="cn('mt-4 flex flex-col items-start gap-6')">
			<Dialog
				v-model:open="dialogOpen"
				title="Dialog"
				description="Rendered open for the SSR gate."
			>
				<template #trigger>
					<Button>Open dialog</Button>
				</template>
				<p :class="cn('text-sm')">Dialog body content.</p>
				<template #footer>
					<Button variant="secondary" @click="dialogOpen = false">Close</Button>
				</template>
			</Dialog>

			<Popover>
				<template #trigger>Popover</template>
				<p :class="cn('text-sm')">Popover panel content.</p>
			</Popover>

			<Tooltip content="Tooltip content">
				<Button variant="secondary">Hover me</Button>
			</Tooltip>
		</div>
	</main>
</template>
