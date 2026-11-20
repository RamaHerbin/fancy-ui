<script lang="ts">
	import type { PlaygroundValues } from "$lib/inspiration/types.js";
	import { TickNav, type TickNavItem } from "$lib/fancy-ui/tick-nav";

	let { values }: { values: PlaygroundValues } = $props();

	const items: TickNavItem[] = [
		{ id: "signal", label: "01 Signal" },
		{ id: "noise", label: "02 Noise" },
		{ id: "pulse", label: "03 Pulse" },
		{ id: "drift", label: "04 Drift", badge: "New" },
		{ id: "echo", label: "05 Echo" },
		{ id: "carrier", label: "06 Carrier" },
	];

	const swatches: Record<string, string> = {
		signal: "linear-gradient(135deg, #22d3ee, #a78bfa)",
		noise: "linear-gradient(135deg, #f59e0b, #b45309)",
		pulse: "linear-gradient(135deg, #a855f7, #e11d48)",
		drift: "linear-gradient(135deg, #14b8a6, #0ea5e9)",
		echo: "linear-gradient(135deg, #6366f1, #be185d)",
		carrier: "linear-gradient(135deg, #84cc16, #166534)",
	};

	let value = $state("pulse");
</script>

<div
	class="finds-tick relative flex h-full w-full items-center bg-[#07060b] pl-[12%] text-[13px] tracking-tight text-white"
	style="--ft-accent: oklch(0.72 0.19 300); --tn-row-gap: 0.4rem"
>
	<TickNav
		{items}
		bind:value
		variant={values.variant === "default" ? "default" : "neon"}
		reach={values.reach as number}
		minorTicks={values.minorTicks as number}
		hdr={values.hdr !== false}
		ariaLabel="Channels"
	>
		{#snippet preview(item)}
			<div class="flex h-full w-full items-end p-2" style:background={swatches[item.id]}>
				<span class="text-[10px] font-medium text-white/90">{item.label}</span>
			</div>
		{/snippet}
	</TickNav>
</div>

<style>
	.finds-tick :global(.tn-preview) {
		width: 6.5rem;
	}
</style>
