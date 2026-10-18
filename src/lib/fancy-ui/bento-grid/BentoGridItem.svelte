<script lang="ts">
	import type { Snippet } from "svelte";
	import BentoFrame from "./BentoFrame.svelte";

	interface Props {
		class?: string;
		header?: Snippet;
		icon?: Snippet;
		title?: Snippet;
		description?: Snippet;
	}

	let { class: className = "", header, icon, title, description }: Props = $props();
</script>

<BentoFrame
	class={["group/bento row-span-1", className].join(" ")}
	panelClass="justify-between gap-4 p-4"
>
	{#if header}
		{@render header()}
	{/if}
	<div class="bento-lift relative">
		{#if icon || title}
			<div class="mb-1.5 flex items-center gap-2.5">
				{#if icon}
					<div class="bento-icon size-8 [&_svg]:size-4">
						{@render icon()}
					</div>
				{/if}
				{#if title}
					<div
						class="min-w-0 font-sans text-[15px] font-medium tracking-tight text-neutral-900 dark:text-neutral-100"
					>
						{@render title()}
					</div>
				{/if}
			</div>
		{/if}
		{#if description}
			<div class="font-sans text-[13px] leading-relaxed text-neutral-500 dark:text-neutral-400">
				{@render description()}
			</div>
		{/if}
	</div>
</BentoFrame>
