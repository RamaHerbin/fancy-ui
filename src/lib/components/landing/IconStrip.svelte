<script lang="ts">
	const chips: { icon: string; label: string }[] = [
		{ icon: "◎", label: "Button" },
		{ icon: "▭", label: "Input" },
		{ icon: "▣", label: "Card" },
		{ icon: "◱", label: "Modal" },
		{ icon: "⚠", label: "Alert" },
		{ icon: "▤", label: "Tabs" },
		{ icon: "☰", label: "Dropdown" },
		{ icon: "◍", label: "Tooltip" },
	];
</script>

<div
	class="flex flex-wrap justify-center gap-2 border-t border-b border-white/5 px-6 py-5 md:px-10 lg:px-14"
>
	{#each chips as chip (chip.label)}
		<a
			href="/docs/components"
			class="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[12.5px] text-[#9aa3b2] transition-colors hover:bg-white/4 hover:text-[#e6e9ef]"
		>
			<span aria-hidden="true">{chip.icon}</span>
			{chip.label}
		</a>
	{/each}
	<span class="inline-flex items-center gap-2 px-3.5 py-2 text-[12.5px] text-[#8b7bff]">
		<span aria-hidden="true">✦</span> And more…
	</span>
</div>
