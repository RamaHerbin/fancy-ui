<script lang="ts">
	import { GradientButton } from "$lib/fancy-ui/gradient-button";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
</script>

<PropsPlayground
	controls={[
		{ key: "duration", type: "range", label: "Duration (ms)", min: 500, max: 8000, step: 100 },
		{ key: "borderWidth", type: "range", label: "Border Width", min: 1, max: 8, step: 1 },
		{ key: "borderRadius", type: "range", label: "Border Radius", min: 0, max: 100, step: 2 },
		{ key: "blur", type: "range", label: "Blur", min: 0, max: 16, step: 1 },
		{ key: "bgColor", type: "color", label: "Background Color" },
	]}
	initialValues={{
		duration: 2500,
		borderWidth: 2,
		borderRadius: 8,
		blur: 4,
		bgColor: "#000000",
	}}
>
	{#snippet preview(values)}
		<div class="flex items-center justify-center py-8">
			<GradientButton
				sound
				duration={values.duration as number}
				borderWidth={values.borderWidth as number}
				borderRadius={values.borderRadius as number}
				blur={values.blur as number}
				bgColor={values.bgColor as string}
				class="font-medium text-white"
			>
				Click me
			</GradientButton>
		</div>
	{/snippet}
</PropsPlayground>
