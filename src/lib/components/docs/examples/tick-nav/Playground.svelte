<script lang="ts">
	import { TickNav, type TickNavItem } from "$lib/fancy-ui/tick-nav";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
	import { tickNavCode } from "./code.js";

	const items: TickNavItem[] = [
		{ id: "signal", label: "01 Signal" },
		{ id: "noise", label: "02 Noise" },
		{ id: "pulse", label: "03 Pulse" },
		{ id: "drift", label: "04 Drift", badge: "New" },
		{ id: "echo", label: "05 Echo" },
	];

	let value = $state("pulse");
</script>

<PropsPlayground
	component="TickNav"
	slug="tick-nav"
	required={["items"]}
	codeFor={tickNavCode}
	controls={[
		{
			key: "variant",
			type: "select",
			label: "Variant",
			options: [
				{ value: "default", label: "default" },
				{ value: "neon", label: "neon" },
			],
		},
		{ key: "reach", type: "range", label: "Reach (rows)", min: 1, max: 8, step: 1 },
		{ key: "minorTicks", type: "range", label: "Minor ticks", min: 0, max: 6, step: 1 },
		{ key: "hdr", type: "boolean", label: "HDR (neon)" },
		{ key: "sound", type: "boolean", label: "Sound" },
		{ key: "ariaLabel", type: "text", label: "Aria label", maxLength: 30 },
	]}
	initialValues={{
		variant: "default",
		reach: 4,
		minorTicks: 2,
		hdr: true,
		sound: false,
		ariaLabel: "Navigation",
	}}
>
	{#snippet preview(values)}
		<div
			class="flex w-[28rem] max-w-[85vw] justify-center overflow-hidden rounded-xl border border-black/[0.08] bg-[#07060b] py-8 text-[15px] tracking-tight text-white dark:border-white/[0.08]"
			style="--ft-accent: oklch(0.72 0.19 300)"
		>
			<TickNav
				{items}
				bind:value
				variant={values.variant as "default" | "neon"}
				reach={values.reach as number}
				minorTicks={values.minorTicks as number}
				hdr={values.hdr as boolean}
				sound={values.sound as boolean}
				ariaLabel={values.ariaLabel as string}
			/>
		</div>
	{/snippet}
</PropsPlayground>
