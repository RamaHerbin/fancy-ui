<script lang="ts">
	import { Marquee, ReviewCard } from "$lib/fancy-ui/marquee";

	const reviews = [
		{ name: "Jack", username: "@jack", body: "I've never seen anything like this before. It's amazing.", img: "https://avatar.vercel.sh/jack" },
		{ name: "Jill", username: "@jill", body: "I don't know what to say. I'm speechless. This is amazing.", img: "https://avatar.vercel.sh/jill" },
		{ name: "John", username: "@john", body: "I'm at a loss for words. This is amazing. I love it.", img: "https://avatar.vercel.sh/john" },
		{ name: "Jane", username: "@jane", body: "I'm at a loss for words. This is amazing. I love it.", img: "https://avatar.vercel.sh/jane" },
		{ name: "Jenny", username: "@jenny", body: "I'm at a loss for words. This is amazing.", img: "https://avatar.vercel.sh/jenny" },
		{ name: "James", username: "@james", body: "I'm at a loss for words. This is amazing.", img: "https://avatar.vercel.sh/james" },
	];

	const firstRow = reviews.slice(0, 3);
	const secondRow = reviews.slice(3);
</script>

<div class="bg-background relative flex w-full flex-col items-center justify-center overflow-hidden rounded-lg border">
	<Marquee pauseOnHover class="[--duration:20s]">
		{#each firstRow as review}
			<ReviewCard {...review} />
		{/each}
	</Marquee>
	<Marquee reverse pauseOnHover class="[--duration:20s]">
		{#each secondRow as review}
			<ReviewCard {...review} />
		{/each}
	</Marquee>
	<div class="from-background pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r"></div>
	<div class="from-background pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l"></div>
</div>
