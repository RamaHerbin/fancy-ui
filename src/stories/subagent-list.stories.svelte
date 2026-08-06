<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { SubagentList } from "$lib/fancy-ui/subagent-list";
	import type { SubagentData } from "$lib/fancy-ui";

	const RUNNING: SubagentData[] = [
		{
			id: "researcher",
			name: "Researcher",
			task: "Read the changelog for breaking changes",
			status: "running",
			progress: 0.62,
			model: "mini",
		},
		{
			id: "writer",
			name: "Writer",
			task: "Draft the migration note",
			status: "running",
			progress: 0.28,
			model: "pro",
		},
		{
			id: "reviewer",
			name: "Reviewer",
			task: "Check every code sample still compiles",
			status: "running",
			progress: 0.05,
			model: "pro",
		},
	];

	const MIXED: SubagentData[] = [
		{
			id: "researcher",
			name: "Researcher",
			task: "Read the changelog for breaking changes",
			status: "done",
			model: "mini",
		},
		{
			id: "writer",
			name: "Writer",
			task: "Draft the migration note",
			status: "running",
			progress: 0.44,
			model: "pro",
		},
		{
			id: "reviewer",
			name: "Reviewer",
			task: "Check every code sample still compiles",
			status: "error",
			model: "pro",
		},
		{ id: "publisher", name: "Publisher", task: "Open the pull request", status: "pending" },
		{ id: "notifier", name: "Notifier", task: "Post the summary", status: "cancelled" },
	];

	const { Story } = defineMeta({
		title: "AI Agents/SubagentList",
		component: SubagentList,
		tags: ["autodocs"],
		args: {
			agents: RUNNING,
		},
		argTypes: {
			agents: {
				control: "object",
				description: "The delegated workers, in the order they were spawned",
			},
			label: {
				control: "text",
				description: "Accessible name for the list; derived from the statuses when left unset",
			},
			compact: {
				control: "boolean",
				description: "Tighter rows with the task line dropped",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<div class="w-full max-w-xl p-6">
		<SubagentList {...args} />
	</div>
{/snippet}

<Story name="Running" {template} />

<Story name="Mixed" {template} args={{ agents: MIXED }} />

<Story name="Compact" {template} args={{ agents: MIXED, compact: true }} />

<Story
	name="Finished"
	{template}
	args={{ agents: MIXED.map((agent) => ({ ...agent, status: "done", progress: undefined })) }}
/>

<Story name="Selectable" {template} args={{ agents: MIXED, onSelect: () => {} }} />
