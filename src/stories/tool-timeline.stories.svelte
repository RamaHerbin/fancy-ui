<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { ToolTimeline } from "$lib/fancy-ui/tool-timeline";
	import type { ToolTimelineItemData } from "$lib/fancy-ui";

	// Relative to module load rather than a baked-in date, so the timestamps stay
	// fresh instead of drifting further off on every reload.
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

	const { Story } = defineMeta({
		title: "AI Agents/ToolTimeline",
		component: ToolTimeline,
		tags: ["autodocs"],
		args: {
			items: session,
			compact: false,
			label: "Activity",
		},
		argTypes: {
			items: { control: "object", description: "The agent's activity log, oldest first" },
			compact: {
				control: "boolean",
				description: "Tighter rows with the detail line dropped",
			},
			label: { control: "text", description: "Accessible name for the list" },
		},
	});
</script>

{#snippet template(args: any)}
	<div class="bg-card w-full max-w-xl rounded-lg border p-5">
		<ToolTimeline {...args} />
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Compact" {template} args={{ compact: true }} />

<!-- Supplying onSelect is what turns every row into a button. -->
<Story
	name="Clickable"
	{template}
	args={{
		onSelect: (item: ToolTimelineItemData, index: number) =>
			console.log("selected", index, item.verb, item.target),
	}}
/>
