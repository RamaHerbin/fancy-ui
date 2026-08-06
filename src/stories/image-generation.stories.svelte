<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { ImageGeneration } from "$lib/fancy-ui/image-generation";

	// Drawn locally so the story has no network dependency in any environment.
	const artwork = `data:image/svg+xml,${encodeURIComponent(
		`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'>
			<defs>
				<linearGradient id='sky' x1='0' y1='0' x2='0.4' y2='1'>
					<stop offset='0' stop-color='hsl(258 85% 40%)'/>
					<stop offset='0.55' stop-color='hsl(318 78% 55%)'/>
					<stop offset='1' stop-color='hsl(28 95% 62%)'/>
				</linearGradient>
			</defs>
			<rect width='512' height='512' fill='url(#sky)'/>
			<circle cx='348' cy='174' r='52' fill='hsl(46 100% 76%)'/>
			<path d='M0 372 120 292 236 356 336 286 512 348 512 512 0 512Z' fill='hsl(266 55% 20%)' opacity='0.85'/>
			<path d='M0 438 132 384 292 448 512 402 512 512 0 512Z' fill='hsl(266 65% 12%)'/>
		</svg>`.replace(/\s+/g, " ")
	)}`;

	const { Story } = defineMeta({
		title: "AI Chat/ImageGeneration",
		component: ImageGeneration,
		tags: ["autodocs"],
		args: {
			status: "generating",
			alt: "a lone barn under a sodium sunset, 35mm, grain",
			prompt: "a lone barn under a sodium sunset, 35mm, grain",
			aspectRatio: "1 / 1",
			errorText: "Generation failed",
		},
		argTypes: {
			status: {
				control: "select",
				options: ["idle", "generating", "done", "error"],
				description: "Which stage of the generation to render",
			},
			alt: {
				control: "text",
				description: "Describes the image to assistive tech — typically the prompt",
			},
			prompt: { control: "text", description: "Muted caption line under the frame" },
			aspectRatio: {
				control: "text",
				description: "CSS aspect-ratio of the frame, holding the layout across every state",
			},
			errorText: { control: "text", description: "The failure line shown in the error state" },
		},
	});
</script>

{#snippet template(args: any)}
	<div class="w-72">
		<ImageGeneration {...args} />
	</div>
{/snippet}

<Story name="Idle" {template} args={{ status: "idle" }} />

<Story name="Generating" {template} args={{ status: "generating" }} />

<Story name="Done" {template} args={{ status: "done", src: artwork }} />

<Story
	name="Error"
	{template}
	args={{ status: "error", errorText: "The model returned no image", onRetry: () => {} }}
/>

<Story
	name="Wide"
	{template}
	args={{ status: "done", src: artwork, aspectRatio: "16 / 9" }}
	parameters={{ docs: { description: { story: "The frame takes any CSS aspect-ratio." } } }}
/>
