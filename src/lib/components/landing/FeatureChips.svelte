<script lang="ts">
	const features: {
		icon: string;
		iconBg: string;
		iconColor: string;
		title: string;
		subtitle: string;
	}[] = [
		{
			icon: "⚡",
			iconBg: "rgba(255,93,59,.12)",
			iconColor: "#ff5d3b",
			title: "Svelte 5",
			subtitle: "Built for runes",
		},
		{
			icon: "◎",
			iconBg: "rgba(91,140,255,.12)",
			iconColor: "#5b8cff",
			title: "Accessible",
			subtitle: "WAI-ARIA first",
		},
		{
			icon: "◉",
			iconBg: "rgba(52,211,153,.12)",
			iconColor: "#34d399",
			title: "Animated",
			subtitle: "Delightful by default",
		},
		{
			icon: "⌘",
			iconBg: "rgba(161,66,255,.12)",
			iconColor: "#c084fc",
			title: "Customizable",
			subtitle: "Themeable & flexible",
		},
		{
			icon: "⇅",
			iconBg: "rgba(66,207,255,.12)",
			iconColor: "#42cfff",
			title: "Lightweight",
			subtitle: "Tree-shakeable",
		},
	];
</script>

<div
	class="grid grid-cols-1 gap-3.5 px-4 pb-16 sm:grid-cols-2 sm:px-8 md:grid-cols-3 lg:grid-cols-5 lg:px-14"
>
	{#each features as feature (feature.title)}
		<div
			class="flex items-center gap-3 rounded-xl border border-white/8 bg-[rgba(15,15,22,.8)] px-[18px] py-4"
		>
			<span
				aria-hidden="true"
				class="flex h-[34px] w-[34px] items-center justify-center rounded-[9px]"
				style={`background:${feature.iconBg};color:${feature.iconColor}`}
			>
				{feature.icon}
			</span>
			<span class="flex flex-col">
				<span class="text-[13px] font-semibold text-white">{feature.title}</span>
				<span class="text-[11.5px] text-[#9aa3b2]">{feature.subtitle}</span>
			</span>
		</div>
	{/each}
</div>
