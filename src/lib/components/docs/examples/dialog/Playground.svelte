<script lang="ts">
	import { Dialog } from "$lib/fancy-ui/dialog";
	import { Button } from "$lib/fancy-ui/button";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
	import type { Framework } from "$lib/inspiration/types.js";

	let open = $state(false);

	const str = (value: unknown) => JSON.stringify(String(value));

	/** The usage per framework: a dialog needs its trigger, footer and open state next to it. */
	function codeFor(values: Record<string, string | number | boolean>, framework: Framework) {
		const dismissible = values.dismissible === false ? "false" : null;
		if (framework === "react") {
			return `<Dialog
	open={open}
	onOpenChange={setOpen}
	title=${str(values.title)}
	description=${str(values.description)}${dismissible ? "\n\tdismissible={false}" : ""}
	trigger={<Button>Open dialog</Button>}
	footer={<Button onClick={() => setOpen(false)}>Done</Button>}
>
	Dialog content
</Dialog>`;
		}
		if (framework === "vue") {
			return `<Dialog
	v-model:open="open"
	title=${str(values.title)}
	description=${str(values.description)}${dismissible ? '\n\t:dismissible="false"' : ""}
>
	<template #trigger><Button>Open dialog</Button></template>
	Dialog content
	<template #footer><Button :onclick="() => (open = false)">Done</Button></template>
</Dialog>`;
		}
		return `{#snippet trigger()}
	<Button>Open dialog</Button>
{/snippet}

{#snippet footer()}
	<Button onclick={() => (open = false)}>Done</Button>
{/snippet}

<Dialog
	bind:open
	{trigger}
	{footer}
	title=${str(values.title)}
	description=${str(values.description)}${dismissible ? "\n\tdismissible={false}" : ""}
>
	Dialog content
</Dialog>`;
	}
</script>

<PropsPlayground
	component="Dialog"
	slug="dialog"
	importNames={{
		svelte: ["Dialog", "Button"],
		react: ["Dialog", "Button"],
		vue: ["Dialog", "Button"],
	}}
	constraints={[
		"Keep the open state in the page: `bind:open` (Svelte), `open` + `onOpenChange` (React), `v-model:open` (Vue).",
		"Give it a `title`: it names the dialog for assistive technology.",
	]}
	{codeFor}
	controls={[
		{ key: "title", type: "text", label: "Title", maxLength: 60 },
		{ key: "description", type: "text", label: "Description", maxLength: 120 },
		{ key: "dismissible", type: "boolean", label: "Dismissible" },
	]}
	initialValues={{
		title: "Invite a member",
		description: "Send an email invite to join the workspace.",
		dismissible: true,
	}}
>
	{#snippet preview(values)}
		{#snippet trigger()}
			<Button>Open dialog</Button>
		{/snippet}
		{#snippet footer()}
			<Button onclick={() => (open = false)}>Done</Button>
		{/snippet}
		<Dialog
			bind:open
			{trigger}
			{footer}
			title={values.title as string}
			description={values.description as string}
			dismissible={values.dismissible as boolean}
		>
			<p class="text-muted-foreground text-sm">Dialog content</p>
		</Dialog>
	{/snippet}
</PropsPlayground>
