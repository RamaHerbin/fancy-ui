<script lang="ts">
	import { Marquee, ReviewCard } from "$lib/fancy-ui/marquee";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";

	const reviews = [
		{
			name: "Jack",
			username: "@jack",
			body: "I've never seen anything like this before. It's amazing. I love it.",
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
			body: "I'm at a loss for words. This is amazing. I love it.",
			img: "https://avatar.vercel.sh/jenny",
		},
		{
			name: "James",
			username: "@james",
			body: "I'm at a loss for words. This is amazing. I love it.",
			img: "https://avatar.vercel.sh/james",
		},
	];

	const firstRow = reviews.slice(0, reviews.length / 2);
	const secondRow = reviews.slice(reviews.length / 2);
</script>

<svelte:head>
	<title>Marquee - FancyUI</title>
</svelte:head>

<div class="container mx-auto px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">Marquee</h1>
	<p class="text-muted-foreground mb-8">
		An infinite scrolling component that can be used to display text, images, or cards.
	</p>

	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Basic Usage</h2>
		<div
			class="bg-background relative flex w-full flex-col items-center justify-center overflow-hidden rounded-lg border"
		>
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
			<div
				class="from-background pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r"
			></div>
			<div
				class="from-background pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l"
			></div>
		</div>
	</section>

	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Vertical</h2>
		<div
			class="bg-background relative flex h-[500px] w-full flex-row items-center justify-center overflow-hidden rounded-lg border"
		>
			<Marquee vertical pauseOnHover class="[--duration:20s]">
				{#each firstRow as review}
					<ReviewCard {...review} />
				{/each}
			</Marquee>
			<Marquee vertical reverse pauseOnHover class="[--duration:20s]">
				{#each secondRow as review}
					<ReviewCard {...review} />
				{/each}
			</Marquee>
			<Marquee vertical pauseOnHover class="[--duration:20s]">
				{#each firstRow as review}
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
	</section>

	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Interactive Playground</h2>
		<PropsPlayground
			controls={[
				{ key: 'reverse', type: 'boolean', label: 'Reverse' },
				{ key: 'pauseOnHover', type: 'boolean', label: 'Pause on Hover' },
				{ key: 'vertical', type: 'boolean', label: 'Vertical' },
			]}
			initialValues={{ reverse: false, pauseOnHover: false, vertical: false }}
		>
			{#snippet preview(values)}
				<div class="relative w-full overflow-hidden rounded-xl border bg-background {values.vertical ? 'flex h-56 flex-row' : 'flex flex-col'}">
					<Marquee
						reverse={values.reverse as boolean}
						pauseOnHover={values.pauseOnHover as boolean}
						vertical={values.vertical as boolean}
						class="[--duration:20s]"
					>
						{#each firstRow as review}
							<ReviewCard {...review} />
						{/each}
					</Marquee>
					<div class="from-background pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r"></div>
					<div class="from-background pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l"></div>
				</div>
			{/snippet}
		</PropsPlayground>
	</section>

	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Props</h2>
		<div class="bg-card overflow-x-auto rounded-lg border">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b">
						<th class="px-4 py-3 text-left font-medium">Prop</th>
						<th class="px-4 py-3 text-left font-medium">Type</th>
						<th class="px-4 py-3 text-left font-medium">Default</th>
						<th class="px-4 py-3 text-left font-medium">Description</th>
					</tr>
				</thead>
				<tbody>
					<tr class="border-b">
						<td class="px-4 py-3 font-mono text-xs">reverse</td>
						<td class="px-4 py-3 font-mono text-xs">boolean</td>
						<td class="px-4 py-3 font-mono text-xs">false</td>
						<td class="px-4 py-3">Reverse the animation direction</td>
					</tr>
					<tr class="border-b">
						<td class="px-4 py-3 font-mono text-xs">pauseOnHover</td>
						<td class="px-4 py-3 font-mono text-xs">boolean</td>
						<td class="px-4 py-3 font-mono text-xs">false</td>
						<td class="px-4 py-3">Pause animation on hover</td>
					</tr>
					<tr class="border-b">
						<td class="px-4 py-3 font-mono text-xs">vertical</td>
						<td class="px-4 py-3 font-mono text-xs">boolean</td>
						<td class="px-4 py-3 font-mono text-xs">false</td>
						<td class="px-4 py-3">Enable vertical scrolling</td>
					</tr>
					<tr>
						<td class="px-4 py-3 font-mono text-xs">repeat</td>
						<td class="px-4 py-3 font-mono text-xs">number</td>
						<td class="px-4 py-3 font-mono text-xs">4</td>
						<td class="px-4 py-3">Number of times to repeat content</td>
					</tr>
				</tbody>
			</table>
		</div>
	</section>
</div>
