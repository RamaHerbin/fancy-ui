<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/thread-list/BasicUsage.svelte.
import { computed, ref } from "vue";
import { ThreadList } from "fancy-ui-vue";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const now = Date.now();

type Thread = { id: string; title: string; preview?: string; updatedAt: Date | number; unread?: boolean };

const threads = ref<Thread[]>([
	{
		id: "t1",
		title: "Retry policy for billing webhooks",
		preview: "So a 429 should back off exponentially, capped at five minutes.",
		updatedAt: now - 4 * MINUTE,
		unread: true,
	},
	{
		id: "t2",
		title: "Migration plan for the events table",
		preview: "Split it before the backfill, not after.",
		updatedAt: now - 3 * HOUR,
	},
	{
		id: "t3",
		title: "Naming the new endpoint",
		preview: "/v2/runs reads better than /v2/executions.",
		updatedAt: now - 26 * HOUR,
	},
	{
		id: "t4",
		title: "Why the dashboard is slow on Mondays",
		preview: "Every cron lands at 00:00 UTC and they all query the same index.",
		updatedAt: now - 3 * DAY,
	},
	{
		id: "t5",
		title: "Copy pass on the onboarding emails",
		preview: "Three of the four say “simply”.",
		updatedAt: now - 9 * DAY,
	},
]);

const activeId = ref("t2");

const selected = computed(() => threads.value.find((thread) => thread.id === activeId.value));

function open(thread: Thread) {
	threads.value = threads.value.map((entry) =>
		entry.id === thread.id ? { ...entry, unread: false } : entry
	);
}

function remove(thread: Thread) {
	threads.value = threads.value.filter((entry) => entry.id !== thread.id);
	if (activeId.value === thread.id) activeId.value = threads.value[0]?.id ?? "";
}
</script>

<template>
	<div class="bg-card grid w-full max-w-2xl gap-4 rounded-lg border p-4 sm:grid-cols-[20rem_1fr]">
		<ThreadList
			sound
			:threads="threads"
			v-model:active-id="activeId"
			:on-select="open"
			:on-delete="remove"
		>
			<template #empty>
				<p class="text-muted-foreground px-2 py-6 text-center text-xs">
					Every conversation deleted. Refresh to bring them back.
				</p>
			</template>
		</ThreadList>

		<div class="bg-muted/40 flex min-h-40 flex-col justify-center rounded-md p-4">
			<template v-if="selected">
				<p class="text-foreground/70 text-xs font-medium tracking-wide uppercase">Conversation</p>
				<p class="mt-1 font-medium">{{ selected.title }}</p>
				<p class="text-foreground/70 mt-1 text-xs">{{ selected.preview }}</p>
			</template>
			<p v-else class="text-foreground/70 text-xs">Pick a conversation on the left.</p>
		</div>
	</div>

	<p class="text-muted-foreground mt-3 max-w-2xl text-xs">
		The unread dot clears the moment the thread is opened, and each row reveals its delete button on
		hover — or on focus, if you tab through instead.
	</p>
</template>
