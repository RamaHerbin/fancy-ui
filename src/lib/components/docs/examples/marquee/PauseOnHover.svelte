<script lang="ts">
	import { Marquee } from "$lib/fancy-ui/marquee";

	const words = [
		"Svelte 5",
		"Runes",
		"Tailwind v4",
		"TypeScript",
		"Web Animations",
		"Reduced motion",
		"SSR safe",
		"MIT License",
	];
</script>

<!-- Hover a strip: the conveyor brakes to a stop instead of freezing, and pulls away again on leave. -->
<div
	class="w-full rounded-[22px] border border-black/[.08] bg-[#f4f4f5] p-1.5 dark:border-white/[.08] dark:bg-[#0b0b0c]"
>
	<div
		class="flex flex-col gap-3 rounded-2xl border border-black/[.06] bg-white py-6 dark:border-white/[.06] dark:bg-[#111113]"
	>
		<Marquee pauseOnHover speed={1.5} class="[--duration:30s] [--gap:0.75rem]">
			{#each words as word (word)}
				<span
					class="rounded-full border border-black/[.08] bg-[#fafafa] px-3.5 py-1.5 font-mono text-[12px] tracking-tight whitespace-nowrap text-zinc-600 dark:border-white/[.08] dark:bg-[#141416] dark:text-zinc-400"
				>
					{word}
				</span>
			{/each}
		</Marquee>
		<Marquee pauseOnHover reverse class="[--duration:40s] [--gap:2.5rem]">
			{#each words as word (word)}
				<span
					class="text-[28px] font-medium tracking-[-0.03em] whitespace-nowrap text-zinc-900 dark:text-zinc-100"
				>
					{word}
				</span>
			{/each}
		</Marquee>
		<p class="px-6 text-center font-mono text-[11px] text-zinc-500">
			Hover a strip to brake it to a stop
		</p>
	</div>
</div>
