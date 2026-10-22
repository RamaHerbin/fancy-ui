<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/chat-error/BasicUsage.svelte.
import { onUnmounted, ref } from "vue";
import { ChatError } from "fancy-ui-vue";

/** How long the pretend request takes before it comes back green. */
const RETRY_MS = 1500;

const phase = ref<"failed" | "retrying" | "recovered">("failed");
let timer: ReturnType<typeof setTimeout> | undefined;

function retry() {
	phase.value = "retrying";
	timer = setTimeout(() => {
		timer = undefined;
		phase.value = "recovered";
	}, RETRY_MS);
}

function replay() {
	clearTimeout(timer);
	timer = undefined;
	phase.value = "failed";
}

onUnmounted(() => clearTimeout(timer));
</script>

<template>
	<div class="flex w-full max-w-md flex-col gap-3 p-6">
		<div class="bg-primary text-primary-foreground ml-auto rounded-2xl rounded-br-sm px-4 py-2.5">
			<p class="text-sm">What changed in yesterday's deploy?</p>
		</div>

		<template v-if="phase === 'recovered'">
			<div class="bg-muted mr-auto rounded-2xl rounded-bl-sm px-4 py-2.5">
				<p class="text-sm leading-relaxed">
					Three commits landed: a cache fix, the new export endpoint, and a dependency bump.
				</p>
			</div>
			<button
				type="button"
				class="text-muted-foreground hover:text-foreground self-start text-xs underline underline-offset-4"
				@click="replay"
			>
				Replay the failure
			</button>
		</template>
		<ChatError
			v-else
			sound
			message="The assistant couldn't finish that reply"
			detail="network_error · request 8f21c0"
			:on-retry="retry"
			:retrying="phase === 'retrying'"
		/>
	</div>
</template>
