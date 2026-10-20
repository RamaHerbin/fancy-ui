<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/text-roll/BasicUsage.svelte.
import { computed, ref } from "vue";
import { TextRoll, Switch } from "fancy-ui-vue";

const yearly = ref(false);
const price = computed(() => (yearly.value ? "$40" : "$50"));
</script>

<template>
	<div class="flex w-full flex-col items-center gap-6 p-6">
		<div
			class="bg-card border-border flex w-full max-w-xs flex-col items-center gap-1 rounded-xl border p-6"
		>
			<p class="text-muted-foreground text-sm">Pro plan</p>
			<p class="text-foreground flex items-baseline gap-1 text-4xl font-semibold">
				<TextRoll :value="price" tabular live="polite" />
				<span class="text-muted-foreground text-base font-normal">/mo</span>
			</p>
			<p class="text-muted-foreground text-xs">
				{{ yearly ? "Billed annually" : "Billed monthly" }}
			</p>
		</div>

		<Switch v-model:checked="yearly">Bill yearly, save 20%</Switch>
	</div>
</template>
