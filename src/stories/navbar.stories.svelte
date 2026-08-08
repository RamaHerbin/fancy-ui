<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Navbar, NavbarLink } from "$lib/fancy-ui/navbar";

	const { Story } = defineMeta({
		title: "Navigation/Navbar",
		component: Navbar,
		tags: ["autodocs"],
		args: {
			label: "Main",
			sticky: false,
			bordered: true,
		},
		argTypes: {
			label: { control: "text", description: "Accessible name for the nav landmark" },
			sticky: {
				control: "boolean",
				description: "Pins the bar to the top with a blurred, translucent background",
			},
			bordered: { control: "boolean", description: "Draws a 1px hairline along the bottom edge" },
		},
	});
</script>

{#snippet brand()}
	<span class="h-2 w-2 rounded-sm bg-gradient-to-br from-purple-500 to-cyan-400" aria-hidden="true"
	></span>
	FancyUI
{/snippet}

{#snippet template(args: any)}
	<Navbar {...args} {brand}>
		<NavbarLink href="#docs" current>Docs</NavbarLink>
		<NavbarLink href="#components">Components</NavbarLink>
		<NavbarLink href="#showcase">Showcase</NavbarLink>
	</Navbar>
{/snippet}

{#snippet withActionsTemplate(args: any)}
	<Navbar {...args} {brand}>
		<NavbarLink href="#docs" current>Docs</NavbarLink>
		<NavbarLink href="#components">Components</NavbarLink>
		<NavbarLink href="#showcase">Showcase</NavbarLink>
		{#snippet actions()}
			<span class="text-muted-foreground text-[13px]">⌕</span>
			<span class="bg-foreground text-background rounded-[6px] px-3.5 py-1.5 text-xs font-medium">
				Sign in
			</span>
		{/snippet}
	</Navbar>
{/snippet}

<Story name="Default" {template} />

<Story name="With Actions" template={withActionsTemplate} />

<Story name="No Border" {template} args={{ bordered: false }} />

<Story name="Sticky" {template} args={{ sticky: true }} />
