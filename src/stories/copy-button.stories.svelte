<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { CopyButton } from "$lib/fancy-ui/copy-button";

	const { Story } = defineMeta({
		title: "Actions/CopyButton",
		component: CopyButton,
		tags: ["autodocs"],
		args: {
			value: "npm install fancy-ui-svelte",
			label: "Copy",
			copiedLabel: "Copied",
			resetMs: 2000,
			variant: "outline",
			size: "md",
			disabled: false,
			iconOnly: false,
		},
		argTypes: {
			value: { control: "text", description: "The text written to the clipboard on activation" },
			label: { control: "text", description: "Idle label" },
			copiedLabel: { control: "text", description: "Label shown after a successful copy" },
			resetMs: { control: "number", description: "How long the copied state holds, in ms" },
			variant: {
				control: "select",
				options: ["primary", "secondary", "outline", "ghost", "accent", "destructive"],
				description: "Passed straight through to the underlying Button",
			},
			size: {
				control: "select",
				options: ["sm", "md", "lg"],
				description: "Passed through to Button",
			},
			disabled: { control: "boolean", description: "Disables the button and blocks the copy" },
			iconOnly: { control: "boolean", description: "Drops the visible label into aria-label" },
		},
	});
</script>

{#snippet template(args: any)}
	<CopyButton {...args} />
{/snippet}

{#snippet variantsTemplate()}
	<div class="flex flex-wrap items-center gap-3">
		<CopyButton value="npm install fancy-ui-svelte" variant="outline" />
		<CopyButton value="npm install fancy-ui-svelte" variant="ghost" />
		<CopyButton value="npm install fancy-ui-svelte" variant="secondary" />
		<CopyButton value="npm install fancy-ui-svelte" variant="accent" />
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Icon Only" {template} args={{ iconOnly: true, label: "Copy install command" }} />

<Story name="Disabled" {template} args={{ disabled: true }} />

<Story name="Variants" template={variantsTemplate} />
