<script lang="ts">
	import { NumberTicker } from "$lib/fancy-ui/number-ticker";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
</script>

<PropsPlayground
	controls={[
		{ key: "value", type: "range", label: "Value", min: 0, max: 100000, step: 100 },
		{ key: "duration", type: "range", label: "Duration (ms)", min: 200, max: 5000, step: 100 },
		{ key: "delay", type: "range", label: "Delay (ms)", min: 0, max: 2000, step: 100 },
		{ key: "decimalPlaces", type: "range", label: "Decimal Places", min: 0, max: 4, step: 1 },
		{
			key: "direction",
			type: "select",
			label: "Direction",
			options: [
				{ value: "up", label: "Up" },
				{ value: "down", label: "Down" },
			],
		},
	]}
	initialValues={{ value: 1234, duration: 1000, delay: 0, decimalPlaces: 0, direction: "up" }}
>
	{#snippet preview(values)}
		<div class="flex items-center justify-center rounded-xl p-12">
			<NumberTicker
				value={values.value as number}
				duration={values.duration as number}
				delay={values.delay as number}
				decimalPlaces={values.decimalPlaces as number}
				direction={values.direction as "up" | "down"}
				class="text-6xl font-bold"
			/>
		</div>
	{/snippet}
</PropsPlayground>
