<script lang="ts">
	import { onMount } from "svelte";
	import { ToolTimeline } from "$lib/fancy-ui/tool-timeline";
	import type { ToolTimelineItemData } from "$lib/fancy-ui";

	// One agent session, oldest first. Timestamps are offsets from mount so the
	// relative times read sensibly whenever the page is opened.
	const now = Date.now();

	const session: ToolTimelineItemData[] = [
		{
			id: "read-utils",
			verb: "Read",
			target: "src/lib/utils.ts",
			detail: "Looking for the class merge helper",
			timestamp: now - 6 * 60_000,
		},
		{
			id: "search",
			verb: "Searched",
			target: "**/*.svelte",
			detail: "42 files matched",
			timestamp: now - 5 * 60_000,
		},
		{
			id: "edit-page",
			verb: "Edited",
			target: "src/routes/+page.svelte",
			additions: 24,
			deletions: 7,
			timestamp: now - 3 * 60_000,
		},
		{
			id: "create-test",
			verb: "Created",
			target: "src/lib/fancy-ui/tool-timeline/ToolTimeline.test.ts",
			additions: 96,
			timestamp: now - 90_000,
		},
		{
			id: "run-tests",
			verb: "Ran",
			target: "pnpm vitest run",
			detail: "18 passed",
			timestamp: now - 20_000,
		},
	];

	// The demo starts with the first two rows and appends the rest, so the
	// entrance animation is visible on arrival rather than only in a real session.
	let items = $state<ToolTimelineItemData[]>(session.slice(0, 2));

	onMount(() => {
		// A loop that keeps re-animating is exactly what reduced motion asks us not
		// to do, so it gets the finished session in one piece.
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			items = session;
			return;
		}

		let timer: ReturnType<typeof setTimeout>;
		let next = 2;

		function tick() {
			if (next < session.length) {
				items = session.slice(0, next + 1);
				next += 1;
				timer = setTimeout(tick, 1200);
				return;
			}
			timer = setTimeout(restart, 3000);
		}

		function restart() {
			items = session.slice(0, 2);
			next = 2;
			timer = setTimeout(tick, 1200);
		}

		timer = setTimeout(tick, 1200);
		return () => clearTimeout(timer);
	});
</script>

<div class="bg-card w-full max-w-xl rounded-lg border p-5">
	<p class="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">
		Session activity
	</p>
	<ToolTimeline {items} />
</div>
