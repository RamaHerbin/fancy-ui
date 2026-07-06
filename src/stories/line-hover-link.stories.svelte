<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { LineHoverLink } from "$lib/fancy-ui/line-hover-link";

	const { Story } = defineMeta({
		title: "Navigation/LineHoverLink",
		component: LineHoverLink,
		tags: ["autodocs"],
		args: {
			variant: "slide",
			href: "#",
		},
		argTypes: {
			variant: {
				control: "select",
				options: [
					"slide",
					"double",
					"grow",
					"strike",
					"fade",
					"pulse",
					"swap",
					"sweep",
					"bounce",
					"arc",
					"scribble",
				],
				description: "The animation variant",
			},
			href: { control: "text", description: "Link href" },
		},
	});
</script>

{#snippet template(args: any)}
	<div class="flex min-h-[120px] items-center justify-center text-lg font-medium">
		<LineHoverLink {...args}>Hover me</LineHoverLink>
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Grow" {template} args={{ variant: "grow" }} />

<Story name="Sweep" {template} args={{ variant: "sweep" }} />

<Story name="Scribble" {template} args={{ variant: "scribble" }} />

{#snippet navigation()}
	<div class="flex min-h-[120px] items-center justify-center">
		<nav class="flex gap-8">
			<LineHoverLink variant="slide" href="#" class="text-muted-foreground">Home</LineHoverLink>
			<LineHoverLink variant="slide" href="#" class="text-muted-foreground">About</LineHoverLink>
			<LineHoverLink variant="slide" href="#" class="text-muted-foreground">Services</LineHoverLink>
			<LineHoverLink variant="slide" href="#" class="text-muted-foreground">Contact</LineHoverLink>
		</nav>
	</div>
{/snippet}

<Story name="Navigation" template={navigation} />
