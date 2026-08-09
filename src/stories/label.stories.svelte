<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Label } from "$lib/fancy-ui/label";

	const { Story } = defineMeta({
		title: "Forms/Label",
		component: Label,
		tags: ["autodocs"],
		args: {
			for: "story-email",
			required: false,
		},
		argTypes: {
			for: { control: "text", description: "Explicit target id — a surrounding FormField wins" },
			required: {
				control: "boolean",
				description: "Renders the required asterisk — a surrounding FormField wins",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<div class="flex flex-col gap-1.5">
		<Label {...args}>Email</Label>
		<input
			id={args.for}
			type="email"
			placeholder="you@example.com"
			class="border-input bg-background placeholder:text-muted-foreground w-full rounded-lg border px-3 py-[9px] text-[13px] outline-none"
		/>
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Required" {template} args={{ required: true }} />
