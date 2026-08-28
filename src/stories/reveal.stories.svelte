<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Reveal } from "$lib/fancy-ui/reveal";

	const { Story } = defineMeta({
		title: "Effects/Reveal",
		component: Reveal,
		tags: ["autodocs"],
		args: {
			preset: "fade-up",
			trigger: "view",
			active: false,
			once: true,
			threshold: 0.1,
			rootMargin: "0px 0px -10% 0px",
			duration: 600,
			delay: 0,
			easing: "cubic-bezier(0.16, 1, 0.3, 1)",
			distance: 16,
			stagger: 0,
			from: "first",
			initial: "hidden",
			as: "div",
		},
		argTypes: {
			preset: {
				control: "select",
				options: ["fade", "fade-up", "fade-down", "fade-left", "fade-right", "scale"],
				description: "Which directional/scale look to animate with",
			},
			trigger: {
				control: "select",
				options: ["view", "mount", "manual"],
				description: "What starts the reveal",
			},
			active: {
				control: "boolean",
				description: 'Read only when trigger="manual" — true reveals, false re-arms',
			},
			once: {
				control: "boolean",
				description: 'Disconnects the observer after the first reveal (trigger="view" only)',
			},
			threshold: {
				control: "number",
				description: 'IntersectionObserver threshold (trigger="view" only)',
			},
			rootMargin: {
				control: "text",
				description: 'IntersectionObserver rootMargin (trigger="view" only)',
			},
			duration: { control: "number", description: "Entrance duration in ms" },
			delay: { control: "number", description: "Delay before the entrance starts, in ms" },
			easing: { control: "text", description: "CSS easing for the entrance" },
			distance: {
				control: "number",
				description: "Travel distance in px for the four directional presets",
			},
			stagger: {
				control: "number",
				description:
					"ms per stagger step; 0 animates the root, >0 animates direct element children",
			},
			from: {
				control: "select",
				options: ["first", "last", "center"],
				description: "Where the stagger counts distance from (stagger > 0 only)",
			},
			initial: {
				control: "select",
				options: ["hidden", "visible"],
				description: "Which data-state the first server-rendered paint starts at",
			},
			as: { control: "text", description: "The element tag Reveal renders as" },
		},
	});
</script>

<script lang="ts">
	let manualActive = $state(true);
</script>

{#snippet template(args: any)}
	<div class="flex w-full items-center justify-center p-8">
		<Reveal {...args} class="bg-card border-border rounded-lg border p-6">
			<p class="text-foreground text-sm">Scrolls into view, then rises and fades in.</p>
		</Reveal>
	</div>
{/snippet}

{#snippet staggerTemplate(args: any)}
	<div class="flex w-full items-center justify-center p-8">
		<Reveal {...args} class="flex gap-3">
			{#each ["One", "Two", "Three", "Four", "Five"] as label (label)}
				<div class="bg-card border-border rounded-lg border px-4 py-3 text-sm">{label}</div>
			{/each}
		</Reveal>
	</div>
{/snippet}

{#snippet manualTemplate(args: any)}
	<div class="flex flex-col items-start gap-4 p-8">
		<button
			type="button"
			class="border-border text-foreground rounded-md border px-3 py-1.5 text-sm"
			onclick={() => (manualActive = !manualActive)}
		>
			{manualActive ? "Hide" : "Show"}
		</button>
		<Reveal {...args} active={manualActive} class="bg-card border-border rounded-lg border p-6">
			<p class="text-foreground text-sm">Toggled by the button above, not the viewport.</p>
		</Reveal>
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Mount trigger" {template} args={{ trigger: "mount" }} />

<Story name="Manual trigger" template={manualTemplate} args={{ trigger: "manual" }} />

<Story name="Scale preset" {template} args={{ trigger: "mount", preset: "scale" }} />

<Story
	name="Stagger from center"
	template={staggerTemplate}
	args={{ trigger: "mount", stagger: 60, from: "center" }}
/>
