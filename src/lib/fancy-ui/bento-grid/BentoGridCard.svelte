<script lang="ts">
	import type { Snippet } from "svelte";
	import BentoFrame from "./BentoFrame.svelte";

	interface Props {
		name: string;
		description: string;
		href: string;
		cta: string;
		class?: string;
		icon?: Snippet;
		background?: Snippet;
	}

	let {
		name,
		description: desc,
		href,
		cta,
		class: className = "",
		icon,
		background,
	}: Props = $props();
</script>

<BentoFrame class={["group col-span-3", className].join(" ")} panelClass="justify-end">
	{#if background}
		<!-- Not aria-hidden and not inert: the slot can hold real, interactive content, as it always could. -->
		<div class="absolute inset-0 -z-10 overflow-hidden">
			{@render background()}
		</div>
	{/if}

	<div class="bento-lift pointer-events-none relative z-10 flex flex-col gap-1 p-6">
		{#if icon}
			<div class="bento-icon mb-3 size-11 [&_svg]:size-5">
				{@render icon()}
			</div>
		{/if}
		<h3 class="text-lg font-medium tracking-tight text-neutral-900 dark:text-neutral-100">
			{name}
		</h3>
		<p class="max-w-lg text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">{desc}</p>
		<a
			{href}
			class="bento-cta pointer-events-auto mt-3 inline-flex w-fit items-center gap-1.5 rounded-md text-sm font-medium text-neutral-900 outline-none focus-visible:ring-2 focus-visible:ring-[var(--bento-accent,#8e9cff)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent dark:text-neutral-100"
		>
			{cta}
			<svg
				aria-hidden="true"
				viewBox="0 0 16 16"
				class="size-3.5 text-[var(--bento-accent,#8e9cff)]"
				fill="none"
				stroke="currentColor"
				stroke-width="1.6"
				stroke-linecap="round"
				stroke-linejoin="round"><path d="M3 8h9.5M8.5 4l4 4-4 4" /></svg
			>
		</a>
	</div>
</BentoFrame>
