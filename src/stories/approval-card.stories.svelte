<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { ApprovalCard } from "$lib/fancy-ui/approval-card";

	const { Story } = defineMeta({
		title: "AI Agents/ApprovalCard",
		component: ApprovalCard,
		tags: ["autodocs"],
		args: {
			title: "Create branch fix/retry-backoff",
			description: "Branches from develop and pushes an empty commit so CI has something to run.",
		},
		argTypes: {
			title: { control: "text", description: "What permission is being asked for" },
			description: { control: "text", description: "Muted second line — the consequence" },
			state: {
				control: "select",
				options: ["pending", "approved", "denied"],
				description: "Which side of the gate we are on (bindable)",
			},
			destructive: {
				control: "boolean",
				description: "Irreversible: red approve button, warning tint, alert on the shield",
			},
			busy: {
				control: "boolean",
				description: "The consumer is executing: both buttons disabled, card aria-busy",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<div class="w-full max-w-xl p-6">
		<ApprovalCard {...args} />
	</div>
{/snippet}

<Story name="Pending" {template} />

<Story
	name="Destructive"
	{template}
	args={{
		title: "Run database migration",
		description:
			"Adds two columns to invoices and backfills 41,880 rows. There is no down migration.",
		destructive: true,
		approveLabel: "Run migration",
		denyLabel: "Not now",
	}}
/>

<Story name="Approved" {template} args={{ state: "approved" }} />

<Story name="Denied" {template} args={{ state: "denied" }} />

<Story name="Busy" {template} args={{ busy: true }} />
