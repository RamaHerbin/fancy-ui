<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Presence } from "$lib/fancy-ui/presence";

	const { Story } = defineMeta({
		title: "Effects/Presence",
		component: Presence,
		tags: ["autodocs"],
		args: {
			preset: "fade",
			duration: 300,
			exitDuration: 200,
			delay: 0,
			distance: 16,
			inert: true,
		},
		argTypes: {
			preset: {
				control: "select",
				options: [
					"fade",
					"fade-up",
					"fade-down",
					"fade-left",
					"fade-right",
					"scale",
					"blur",
					"zoom",
				],
				description: "The entrance/exit look",
			},
			duration: { control: "number", description: "Entrance duration in ms" },
			exitDuration: {
				control: "number",
				description: "Exit duration in ms — shorter than the entrance by default",
			},
			delay: {
				control: "number",
				description: "Delay in ms before the entrance starts; applied to the exit too",
			},
			distance: {
				control: "number",
				description:
					"Entrance travel distance in px for the four directional presets — the exit travels half as far",
			},
			inert: {
				control: "boolean",
				description: "Whether the panel is inert while closing",
			},
		},
	});
</script>

<script lang="ts">
	let open = $state(true);
</script>

{#snippet template(args: any)}
	<div class="flex w-full flex-col items-center gap-4 p-8">
		<button
			type="button"
			class="border-border text-foreground rounded-md border px-3 py-1.5 text-sm"
			onclick={() => (open = !open)}
		>
			Toggle
		</button>
		<Presence {...args} {open}>
			<div class="bg-card border-border rounded-lg border p-6 shadow-sm">
				<p class="text-foreground text-sm">Panel content</p>
			</div>
		</Presence>
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Scale preset" {template} args={{ preset: "scale" }} />

<Story name="Zoom preset" {template} args={{ preset: "zoom" }} />

<Story name="Blur preset" {template} args={{ preset: "blur" }} />

<Story name="Directional" {template} args={{ preset: "fade-up", distance: 32 }} />
