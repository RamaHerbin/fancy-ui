<script lang="ts">
	import { ThreadList } from "$lib/fancy-ui/thread-list";
	import type { ThreadData } from "$lib/fancy-ui";

	const MINUTE = 60_000;
	const HOUR = 60 * MINUTE;
	const DAY = 24 * HOUR;

	// One reading of the clock for the whole fixture, so the rows keep their
	// order relative to each other. Every offset is minutes or more, which is
	// what keeps the relative text identical on the server and after hydration.
	const now = Date.now();

	let threads = $state<ThreadData[]>([
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

	let activeId = $state("t2");

	const selected = $derived(threads.find((thread) => thread.id === activeId));

	function open(thread: ThreadData) {
		// Opening a conversation is what marks it read — the list itself never
		// mutates the data it was handed.
		threads = threads.map((entry) =>
			entry.id === thread.id ? { ...entry, unread: false } : entry
		);
	}

	function remove(thread: ThreadData) {
		threads = threads.filter((entry) => entry.id !== thread.id);
		if (activeId === thread.id) activeId = threads[0]?.id ?? "";
	}
</script>

<div class="bg-card grid w-full max-w-2xl gap-4 rounded-lg border p-4 sm:grid-cols-[20rem_1fr]">
	<ThreadList {threads} bind:activeId onSelect={open} onDelete={remove}>
		{#snippet empty()}
			<p class="text-muted-foreground px-2 py-6 text-center text-xs">
				Every conversation deleted. Refresh to bring them back.
			</p>
		{/snippet}
	</ThreadList>

	<div class="bg-muted/40 flex min-h-40 flex-col justify-center rounded-md p-4">
		{#if selected}
			<p class="text-foreground/70 text-xs font-medium tracking-wide uppercase">Conversation</p>
			<p class="mt-1 font-medium">{selected.title}</p>
			<p class="text-foreground/70 mt-1 text-xs">{selected.preview}</p>
		{:else}
			<p class="text-foreground/70 text-xs">Pick a conversation on the left.</p>
		{/if}
	</div>
</div>

<p class="text-muted-foreground mt-3 max-w-2xl text-xs">
	The unread dot clears the moment the thread is opened, and each row reveals its delete button on
	hover — or on focus, if you tab through instead.
</p>
