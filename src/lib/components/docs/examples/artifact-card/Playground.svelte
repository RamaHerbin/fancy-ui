<script lang="ts">
	import { ArtifactCard } from "$lib/fancy-ui/artifact-card";
	import type { StreamStatus } from "$lib/fancy-ui";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
</script>

<PropsPlayground
	component="ArtifactCard"
	slug="artifact-card"
	required={["title", "version", "versionCount", "preview"]}
	controls={[
		{ key: "title", type: "text", label: "Title", maxLength: 60 },
		{ key: "kind", type: "text", label: "Kind", maxLength: 24 },
		{ key: "version", type: "range", label: "Version", min: 1, max: 9, step: 1 },
		{ key: "versionCount", type: "range", label: "Version count", min: 1, max: 9, step: 1 },
		{
			key: "status",
			type: "select",
			label: "Status",
			options: ["idle", "streaming", "done", "error"].map((v) => ({ value: v, label: v })),
		},
		{ key: "preview", type: "text", label: "Preview", maxLength: 200 },
		{ key: "sound", type: "boolean", label: "Sound" },
	]}
	initialValues={{
		title: "Quarterly summary",
		kind: "Document",
		version: 2,
		versionCount: 3,
		status: "done",
		preview:
			"Revenue closed the quarter six percent ahead of plan, and mid-market outgrew enterprise for the first time.",
		sound: false,
	}}
>
	{#snippet preview(values)}
		<div class="w-[28rem] max-w-[85vw]">
			<ArtifactCard
				title={values.title as string}
				kind={values.kind as string}
				version={values.version as number}
				versionCount={values.versionCount as number}
				status={values.status as StreamStatus}
				preview={values.preview as string}
				sound={values.sound as boolean}
			/>
		</div>
	{/snippet}
</PropsPlayground>
