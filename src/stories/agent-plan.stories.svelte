<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { AgentPlan } from "$lib/fancy-ui/agent-plan";
	import type { PlanStepData } from "$lib/fancy-ui";

	const IN_PROGRESS: PlanStepData[] = [
		{
			id: "s1",
			label: "Read the failing test",
			status: "done",
			detail: "tests/retry.spec.ts",
		},
		{
			id: "s2",
			label: "Locate the retry helper",
			status: "running",
			substeps: [
				{ id: "s2a", label: "Search for retryWithBackoff", status: "done" },
				{ id: "s2b", label: "Open the module it lives in", status: "running", detail: "142 lines" },
			],
		},
		{ id: "s3", label: "Cap the backoff at 30s", status: "pending" },
		{ id: "s4", label: "Run the suite", status: "pending" },
		{ id: "s5", label: "Summarise the change", status: "pending" },
	];

	const COMPLETE: PlanStepData[] = IN_PROGRESS.map((step) => ({
		...step,
		status: "done",
		substeps: step.substeps?.map((sub) => ({ ...sub, status: "done" as const })),
	}));

	const WITH_ERROR: PlanStepData[] = [
		{ id: "e1", label: "Read the failing test", status: "done" },
		{
			id: "e2",
			label: "Locate the retry helper",
			status: "done",
			substeps: [
				{ id: "e2a", label: "Search for retryWithBackoff", status: "done" },
				{ id: "e2b", label: "Open the module it lives in", status: "done" },
			],
		},
		{ id: "e3", label: "Cap the backoff at 30s", status: "done" },
		{
			id: "e4",
			label: "Run the suite",
			status: "error",
			detail: "2 failed — retry.spec.ts:41, queue.spec.ts:12",
		},
		{ id: "e5", label: "Summarise the change", status: "cancelled" },
	];

	const { Story } = defineMeta({
		title: "AI Agents/AgentPlan",
		component: AgentPlan,
		tags: ["autodocs"],
		args: {
			steps: IN_PROGRESS,
			label: "Fix the retry backoff",
		},
		argTypes: {
			steps: {
				control: "object",
				description: "The plan, in the order the agent means to work through it",
			},
			label: { control: "text", description: "Header text, beside the done/total count" },
			showProgress: { control: "boolean", description: "Thin completion bar under the header" },
		},
	});
</script>

{#snippet template(args: any)}
	<div class="w-full max-w-md p-6">
		<AgentPlan {...args} />
	</div>
{/snippet}

<Story name="In Progress" {template} />

<Story name="Complete" {template} args={{ steps: COMPLETE }} />

<Story name="With Error" {template} args={{ steps: WITH_ERROR }} />

<Story
	name="Not Started"
	{template}
	args={{
		steps: IN_PROGRESS.map((s) => ({
			...s,
			status: "pending",
			substeps: s.substeps?.map((sub) => ({ ...sub, status: "pending" })),
		})),
	}}
/>

<Story name="Without Progress Bar" {template} args={{ showProgress: false }} />

<Story
	name="Selectable Rows"
	{template}
	args={{ onSelect: (step: PlanStepData) => console.log(step.id) }}
/>
