<script lang="ts">
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
		{
			name: "Jenny",
			username: "@jenny",
			body: "I'm at a loss for words. This is amazing.",
			img: "https://avatar.vercel.sh/jenny",
		},
		{
			name: "James",
			username: "@james",
			body: "I'm at a loss for words. This is amazing.",
			img: "https://avatar.vercel.sh/james",
		},
	];

	const firstRow = reviews.slice(0, 3);
	const secondRow = reviews.slice(3);
</script>

<!-- Outer shell + inner panel: the same nested hairline frame the cards use. -->
<div
	class="w-full rounded-[22px] border border-black/[.08] bg-[#f4f4f5] p-1.5 dark:border-white/[.08] dark:bg-[#0b0b0c]"
>
	<div
		class="relative flex flex-col gap-1 overflow-hidden rounded-2xl border border-black/[.06] bg-white pt-4 pb-3 dark:border-white/[.06] dark:bg-[#111113]"
	>
		<div class="mb-2 flex items-center justify-between px-5">
			<p class="text-[13px] font-medium tracking-[-0.01em] text-zinc-900 dark:text-zinc-100">
				What people say
			</p>
			<span
				class="rounded-full border border-black/[.08] px-2.5 py-0.5 font-mono text-[11px] text-zinc-500 dark:border-white/[.08]"
			>
				hover to brake
			</span>
		</div>
		<Marquee pauseOnHover class="[--duration:30s]">
			{#each firstRow as review (review.username)}
				<ReviewCard {...review} />
			{/each}
		</Marquee>
		<Marquee reverse pauseOnHover class="[--duration:30s]">
			{#each secondRow as review (review.username)}
				<ReviewCard {...review} />
			{/each}
		</Marquee>
	</div>
</div>
