<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Dialog } from "$lib/fancy-ui/dialog";
	import { Button } from "$lib/fancy-ui/button";

	const { Story } = defineMeta({
		title: "Overlays/Dialog",
		component: Dialog,
		tags: ["autodocs"],
		args: {
			open: true,
			title: "Invite a member",
			description: "Send an email invite to join the workspace.",
			dismissible: true,
		},
		argTypes: {
			open: { control: "boolean", description: "Whether the dialog is open" },
			title: { control: "text", description: "The heading" },
			description: { control: "text", description: "The copy under the title" },
			dismissible: {
				control: "boolean",
				description: "Whether Escape and an outside click close the dialog",
			},
		},
	});
</script>

{#snippet footer()}
	<Button variant="outline">Cancel</Button>
	<Button>Invite</Button>
{/snippet}

{#snippet template(args: any)}
	<Dialog {...args} {footer}>
		<input
			type="email"
			placeholder="email@example.com"
			aria-label="Email address"
			class="border-input bg-background text-muted-foreground placeholder:text-muted-foreground focus-visible:ring-ring/50 focus-visible:border-ring w-full rounded-lg border px-3 py-2 text-[12px] outline-none focus-visible:ring-2"
		/>
	</Dialog>
{/snippet}

{#snippet noFooterTemplate(args: any)}
	<Dialog {...args}>
		<p class="text-muted-foreground text-[12.5px] leading-relaxed">
			Plain body content, no footer.
		</p>
	</Dialog>
{/snippet}

<Story name="Default" {template} />

<Story name="Not Dismissible" {template} args={{ dismissible: false }} />

<Story name="No Description" {template} args={{ description: undefined }} />

<Story name="No Footer" template={noFooterTemplate} />
