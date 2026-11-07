<script lang="ts">
	import { ApprovalCard } from "$lib/fancy-ui/approval-card";
	import type { ApprovalState } from "$lib/fancy-ui/approval-card";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
</script>

<PropsPlayground
	component="ApprovalCard"
	slug="approval-card"
	required={["title"]}
	controls={[
		{ key: "title", type: "text", label: "Title", maxLength: 60 },
		{ key: "description", type: "text", label: "Description", maxLength: 120 },
		{
			key: "state",
			type: "select",
			label: "State",
			options: ["pending", "approved", "denied"].map((v) => ({ value: v, label: v })),
		},
		{ key: "destructive", type: "boolean", label: "Destructive" },
		{ key: "approveLabel", type: "text", label: "Approve label", maxLength: 24 },
		{ key: "denyLabel", type: "text", label: "Deny label", maxLength: 24 },
		{ key: "busy", type: "boolean", label: "Busy" },
		{ key: "sound", type: "boolean", label: "Sound" },
	]}
	initialValues={{
		title: "Run database migration",
		description: "Adds two columns to invoices and backfills 41,880 rows.",
		state: "pending",
		destructive: false,
		approveLabel: "Approve",
		denyLabel: "Deny",
		busy: false,
		sound: false,
	}}
>
	{#snippet preview(values)}
		<div class="w-[28rem] max-w-[85vw]">
			<ApprovalCard
				title={values.title as string}
				description={values.description as string}
				state={values.state as ApprovalState}
				destructive={values.destructive as boolean}
				approveLabel={values.approveLabel as string}
				denyLabel={values.denyLabel as string}
				busy={values.busy as boolean}
				sound={values.sound as boolean}
			>
				<pre
					class="ft-approval-preview text-foreground/80 overflow-x-auto rounded-md px-2.5 py-2 font-mono text-xs">pnpm db:migrate --env production --yes</pre>
			</ApprovalCard>
		</div>
	{/snippet}
</PropsPlayground>
