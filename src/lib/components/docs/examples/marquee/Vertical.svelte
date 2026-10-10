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
	class="w-full rounded-[22px] border border-black/[.08] bg-[#f4f4f5] p-1.5 dark:border-white/[.08] dark:bg-[#0b0b0c]"
>
	<div
		class="relative flex h-[480px] flex-row items-stretch justify-center overflow-hidden rounded-2xl border border-black/[.06] bg-white px-4 dark:border-white/[.06] dark:bg-[#111113]"
	>
		<Marquee vertical pauseOnHover class="[--duration:24s] [--marquee-fade:18%]">
			{#each reviews as review (review.username)}
				<ReviewCard {...review} />
			{/each}
		</Marquee>
		<Marquee vertical reverse pauseOnHover class="[--duration:24s] [--marquee-fade:18%]">
			{#each reviews as review (review.username)}
				<ReviewCard {...review} />
			{/each}
		</Marquee>
	</div>
</div>
