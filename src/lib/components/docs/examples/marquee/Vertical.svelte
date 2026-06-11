<script lang="ts">
	import { Marquee, ReviewCard } from "$lib/fancy-ui/marquee";

	const reviews = [
		{
			name: "Jack",
			username: "@jack",
			body: "I've never seen anything like this before.",
			img: "https://avatar.vercel.sh/jack",
		},
		{
			name: "Jill",
			username: "@jill",
			body: "I'm speechless. This is amazing.",
			img: "https://avatar.vercel.sh/jill",
		},
		{
			name: "John",
			username: "@john",
			body: "I'm at a loss for words.",
			img: "https://avatar.vercel.sh/john",
		},
	];
</script>

<div
	class="bg-background relative flex h-[500px] w-full flex-row items-center justify-center overflow-hidden rounded-lg border"
>
	<Marquee vertical pauseOnHover class="[--duration:20s]">
		{#each reviews as review}
			<ReviewCard {...review} />
		{/each}
	</Marquee>
	<Marquee vertical reverse pauseOnHover class="[--duration:20s]">
		{#each reviews as review}
			<ReviewCard {...review} />
		{/each}
	</Marquee>
	<div
		class="from-background pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b"
	></div>
	<div
		class="from-background pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t"
	></div>
</div>
