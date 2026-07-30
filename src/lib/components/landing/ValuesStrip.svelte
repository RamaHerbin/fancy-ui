<script lang="ts">
	interface Value {
		title: string;
		description: string;
		glyph: string;
		iconClass: string;
		iconBgClass: string;
	}

	const values: Value[] = [
		{
			title: "Open Source",
			description: "MIT licensed and community driven.",
			glyph: "◇",
			iconClass: "text-[#5b8cff]",
			iconBgClass: "bg-[rgba(91,140,255,.1)]",
		},
		{
			title: "Built with ♥",
			description: "Made by developers, for developers.",
			glyph: "♥",
			iconClass: "text-[#f472b6]",
			iconBgClass: "bg-[rgba(244,114,182,.1)]",
		},
		{
			title: "Always improving",
			description: "Frequent updates and new components.",
			glyph: "↻",
			iconClass: "text-[#34d399]",
			iconBgClass: "bg-[rgba(52,211,153,.1)]",
		},
		{
			title: "Themeable",
			description: "Dark, Light and custom themes.",
			glyph: "☀",
			iconClass: "text-[#c084fc]",
			iconBgClass: "bg-[rgba(161,66,255,.1)]",
		},
	];
</script>

<section class="bg-[#08080d] px-4 py-10 sm:px-8 sm:py-12 lg:px-14">
	<div
		class="mx-auto grid max-w-7xl grid-cols-1 gap-3.5 rounded-2xl border border-white/8 bg-[#0b0b12] p-[22px] sm:grid-cols-2 sm:p-6 lg:grid-cols-4"
	>
		{#each values as value (value.title)}
			<div class="flex items-start gap-3.5">
				<span
					class="flex size-[38px] flex-shrink-0 items-center justify-center rounded-[10px] {value.iconBgClass} {value.iconClass}"
					aria-hidden="true"
				>
					{value.glyph}
				</span>
				<span class="flex flex-col gap-0.5">
					<span class="text-[13.5px] font-semibold text-white">{value.title}</span>
					<span class="text-xs leading-[1.5] text-[#9aa3b2]">{value.description}</span>
				</span>
			</div>
		{/each}
	</div>
</section>
