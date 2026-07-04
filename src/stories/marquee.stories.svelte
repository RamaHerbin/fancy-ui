<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Marquee, ReviewCard } from "$lib/fancy-ui/marquee";

	const reviews = [
		{
			name: "Jack",
			username: "@jack",
			body: "I've never seen anything like this before. It's amazing.",
			img: "https://avatar.vercel.sh/jack",
		},
		{
			name: "Jill",
			username: "@jill",
			body: "I don't know what to say. I'm speechless. This is amazing.",
			img: "https://avatar.vercel.sh/jill",
		},
		{
			name: "John",
			username: "@john",
			body: "I'm at a loss for words. This is amazing. I love it.",
			img: "https://avatar.vercel.sh/john",
		},
		{
			name: "Jane",
			username: "@jane",
			body: "I'm at a loss for words. This is amazing. I love it.",
			img: "https://avatar.vercel.sh/jane",
		},
	];

	const { Story } = defineMeta({
		title: "Layout/Marquee",
		component: Marquee,
		tags: ["autodocs"],
		args: {
			reverse: false,
			pauseOnHover: true,
			vertical: false,
			repeat: 4,
		},
		argTypes: {
			reverse: { control: "boolean", description: "Reverse the scroll direction" },
			pauseOnHover: { control: "boolean", description: "Pause animation on hover" },
			vertical: {
				control: "boolean",
				description: "Scroll vertically instead of horizontally",
			},
			repeat: {
				control: "number",
				description: "Number of times to repeat children for seamless loop",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<div class="relative h-72 w-full max-w-3xl overflow-hidden rounded-lg border">
		<Marquee {...args} class="[--duration:20s]">
			{#each reviews as review (review.username)}
				<ReviewCard {...review} />
			{/each}
		</Marquee>
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Reverse" {template} args={{ reverse: true }} />

<Story name="Vertical" {template} args={{ vertical: true }} />
