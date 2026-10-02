<script lang="ts">
	import { Timeline } from "$lib/fancy-ui/timeline";

	const items = [
		{ id: "q1", label: "Q1" },
		{ id: "q2", label: "Q2" },
		{ id: "q3", label: "Q3" },
	];

	const entries: Record<string, { status: string; title: string; body: string }> = {
		q1: {
			status: "Shipped",
			title: "Offline drafts",
			body: "Everything you type is kept on the device first and synced the moment a connection returns.",
		},
		q2: {
			status: "In progress",
			title: "Shared workspaces",
			body: "Invite a team, split work into spaces and keep a single audit trail for every change.",
		},
		q3: {
			status: "Planned",
			title: "Public API",
			body: "Read and write access with scoped tokens, webhooks for every event and typed client libraries.",
		},
	};
</script>

<Timeline
	{items}
	accent="oklch(0.76 0.13 190)"
	title="Roadmap"
	description="Where the product is heading."
>
	{#snippet content(item)}
		{@const entry = entries[item.id]}
		<article class="max-w-md">
			<p class="text-foreground mb-3 text-lg font-semibold tracking-tight md:hidden">
				{item.label}
			</p>
			<div
				class="rounded-2xl border border-black/[0.08] bg-black/[0.025] p-1.5 dark:border-white/[0.08] dark:bg-[#0b0b0c]"
			>
				<div
					class="rounded-[11px] border border-black/[0.08] bg-white p-5 dark:border-white/[0.08] dark:bg-[#141416]"
				>
					<span
						class="text-muted-foreground mb-3 inline-flex items-center gap-1.5 font-mono text-[11px] tracking-wide"
					>
						<span class="size-1.5 rounded-full bg-[oklch(0.76_0.13_190)]" aria-hidden="true"></span>
						{entry.status}
					</span>
					<h4 class="text-foreground text-[15px] font-medium tracking-tight">{entry.title}</h4>
					<p class="text-muted-foreground mt-1.5 text-sm leading-relaxed">{entry.body}</p>
				</div>
			</div>
		</article>
	{/snippet}
</Timeline>
