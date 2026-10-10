<script lang="ts">
	import { Timeline } from "$lib/fancy-ui/timeline";

	const items = [
		{ id: "v4-2", label: "v4.2" },
		{ id: "v4-1", label: "v4.1" },
		{ id: "v4-0", label: "v4.0" },
		{ id: "v3-8", label: "v3.8" },
	];

	const entries: Record<
		string,
		{ date: string; tag: string; title: string; body: string; changes: number }
	> = {
		"v4-2": {
			date: "Sep 12, 2026",
			tag: "Feature",
			changes: 14,
			title: "Streaming exports",
			body: "Large reports now stream to disk while they render, so a 2 GB export starts downloading in under a second.",
		},
		"v4-1": {
			date: "Aug 03, 2026",
			tag: "Performance",
			changes: 9,
			title: "Faster cold starts",
			body: "The worker pool warms in the background, cutting first-request latency by 38% across every region.",
		},
		"v4-0": {
			date: "Jun 18, 2026",
			tag: "Breaking",
			changes: 23,
			title: "Scoped permissions",
			body: "Roles give way to scoped policies. A migration assistant rewrites existing roles on the first sign-in.",
		},
		"v3-8": {
			date: "Apr 27, 2026",
			tag: "Fix",
			changes: 6,
			title: "Calmer notifications",
			body: "Digest mode batches low-priority alerts into one daily summary instead of a steady stream of pings.",
		},
	};
</script>

<Timeline {items} title="Changelog" description="Every release, in the order it shipped.">
	{#snippet content(item)}
		{@const entry = entries[item.id]}
		<article class="max-w-md">
			<p class="text-foreground mb-3 text-lg font-semibold tracking-tight md:hidden">
				{item.label}
			</p>
			<!-- Outer frame -->
			<div
				class="rounded-2xl border border-black/[0.08] bg-black/[0.025] p-1.5 dark:border-white/[0.08] dark:bg-[#0b0b0c]"
			>
				<!-- Inner card -->
				<div
					class="rounded-[11px] border border-black/[0.08] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/[0.08] dark:bg-[#141416] dark:shadow-none"
				>
					<div class="mb-3 flex items-center justify-between gap-3">
						<span
							class="text-muted-foreground font-mono text-[11px] tracking-wide whitespace-nowrap"
						>
							{entry.date}
						</span>
						<span
							class="text-muted-foreground rounded-full border border-black/[0.08] px-2 py-0.5 text-[11px] leading-4 dark:border-white/[0.1]"
						>
							{entry.tag}
						</span>
					</div>
					<h4 class="text-foreground text-[15px] font-medium tracking-tight">{entry.title}</h4>
					<p class="text-muted-foreground mt-1.5 text-sm leading-relaxed">{entry.body}</p>
				</div>
				<div
					class="text-muted-foreground/80 flex items-center justify-between px-3.5 pt-2 pb-1 font-mono text-[10.5px] tracking-wide"
				>
					<span>{item.label}.0</span>
					<span>{entry.changes} changes</span>
				</div>
			</div>
		</article>
	{/snippet}
</Timeline>
